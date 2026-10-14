"""Assess candidate photos and publish visually reviewed, identity-matched assets.

Requires Pillow and NumPy. Assessments never approve or retouch images.
Run --help for commands. See docs/photo-review-workflow.md for the Codex workflow.
"""
import argparse
import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT / 'data/photo-policy.json').read_text())
FORMATS = {'PNG': '.png', 'JPEG': '.jpg', 'WEBP': '.webp'}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def metrics(path):
    path = Path(path).resolve()
    if path.stat().st_size > POLICY['maximumFileBytes']:
        raise ValueError('Image exceeds the file-size limit')
    with Image.open(path) as source:
        if source.format not in FORMATS or getattr(source, 'n_frames', 1) != 1:
            raise ValueError('Use a still PNG, JPEG or WebP product photo')
        if source.width * source.height > POLICY['maximumPixels']:
            raise ValueError('Image exceeds the pixel-count limit')
        source.load()
        image = ImageOps.exif_transpose(source).convert('RGBA')
        width, height = image.size
        format_name = source.format
        # In-memory diagnostic sampling only. Published bytes remain untouched.
        image.thumbnail((512, 512))
        rgba = np.asarray(image, dtype=float) / 255
        rgb = rgba[:, :, :3] * rgba[:, :, 3:] + (1 - rgba[:, :, 3:])
        grey = np.dot(rgb, [0.299, 0.587, 0.114])
        if min(grey.shape) < 3:
            focus = 0.0
        else:
            laplacian = (-4 * grey[1:-1, 1:-1] + grey[:-2, 1:-1] + grey[2:, 1:-1]
                         + grey[1:-1, :-2] + grey[1:-1, 2:])
            focus = float(np.mean(laplacian ** 2) * 10000)
        edge = np.concatenate([rgba[:8].reshape(-1, 4), rgba[-8:].reshape(-1, 4),
                               rgba[:, :8].reshape(-1, 4), rgba[:, -8:].reshape(-1, 4)])
        clean_border = float(np.mean(np.all(edge[:, :3] > .93, axis=1) | (edge[:, 3] < .1)))
    return dict(path=str(path), sha256=digest(path), width=width, height=height,
                format=format_name, bytes=path.stat().st_size,
                focusEnergy=round(focus, 4), cleanBorderFraction=round(clean_border, 4))


def assess(paths):
    reference = metrics(ROOT / POLICY['catalogReference'])
    candidates = []
    for path in paths:
        try:
            item = metrics(path)
            ratio = item['focusEnergy'] / max(reference['focusEnergy'], .0001)
            failures = []
            if item['width'] < POLICY['minimumWidth'] or item['height'] < POLICY['minimumHeight']:
                failures.append('Insufficient native resolution for catalog cards')
            warnings = []
            if ratio < POLICY['focusWarningRatio']:
                warnings.append('Low edge detail relative to the reference; inspect focus and label')
            if item['cleanBorderFraction'] < POLICY['cleanBorderWarningThreshold']:
                warnings.append('Background differs from the clean catalog reference; inspect composition')
            item.update(focusRatioToReference=round(ratio, 4), hardFailures=failures,
                        warnings=warnings, verdict='pending',
                        checks={key: False for key in POLICY['requiredVisualChecks']},
                        product=None, source=None, usagePermission=None,
                        reviewedBy=None, reviewNotes=None)
        except Exception as error:
            item = dict(path=str(Path(path).resolve()), hardFailures=[str(error)], verdict='rejected')
        candidates.append(item)
    return dict(version=1, assessedAt=datetime.now(timezone.utc).isoformat(), reference=reference,
                policyVersion=POLICY['version'], candidates=candidates)


def publish(report, root=ROOT, replace=False):
    root = Path(root)
    manifest_path = root / 'data/photos.json'
    manifest = json.loads(manifest_path.read_text())
    catalog = json.loads((root / 'data/catalog.json').read_text())['fragrances']
    records = {record['id']: record for record in catalog + manifest.get('additionalRecords', [])}
    planned = []
    planned_ids = set()
    for item in report['candidates']:
        if item.get('verdict') != 'approved':
            continue
        if item.get('hardFailures'):
            raise ValueError('Rejected technical checks cannot be overridden')
        if not all(item.get('checks', {}).get(key) is True for key in POLICY['requiredVisualChecks']):
            raise ValueError('Every visual criterion must be inspected and approved')
        if not item.get('reviewedBy') or not item.get('reviewNotes') or not item.get('source') or not item.get('usagePermission'):
            raise ValueError('Record the reviewer, notes, source and usage permission')
        product = item.get('product') or {}
        product_id = product.get('id', '')
        if not re.fullmatch(r'(obf-\d{4,14}|studio-[a-z0-9-]{1,80})', product_id):
            raise ValueError('Use an existing catalog ID or a stable studio product ID')
        if product_id in planned_ids:
            raise ValueError('Review batch contains duplicate product identities')
        planned_ids.add(product_id)
        if product.get('identityConfirmed') is not True:
            raise ValueError('Confirm the exact fragrance identity from its label/source')
        for field in ('brand', 'name', 'concentration'):
            if not isinstance(product.get(field), str) or not 0 < len(product[field].strip()) <= 100:
                raise ValueError('Brand, fragrance and concentration are required')
        size = product.get('sizeMl')
        if isinstance(size, bool) or not isinstance(size, (int, float)) or not 1 <= size <= 2000:
            raise ValueError('Confirm the pictured bottle size in mL')
        previous_record = records.get(product_id)
        if previous_record:
            if product['brand'] != previous_record['brand'] or product['name'] != previous_record['name']:
                raise ValueError('Product identity does not match the catalog record')
            if previous_record.get('concentration') and previous_record['concentration'] != product['concentration']:
                raise ValueError('Concentration does not match the catalog record')
            if previous_record.get('sizeMl') and previous_record['sizeMl'] != size:
                raise ValueError('Bottle size does not match the catalog record')
        actual = metrics(item['path'])
        if actual['sha256'] != item.get('sha256'):
            raise ValueError('Candidate changed after review; reassess it')
        if actual['width'] < POLICY['minimumWidth'] or actual['height'] < POLICY['minimumHeight']:
            raise ValueError('Insufficient native dimensions')
        old = manifest['photos'].get(product_id)
        old_path = root / old.get('url', '') if old else None
        if old_path and old_path.is_file() and digest(old_path) == actual['sha256']:
            asset = old['url']
        else:
            if old and not replace:
                raise ValueError('Replacing an approved image requires --replace')
            asset = 'assets/fragrances/' + product_id + '-' + actual['sha256'][:12] + FORMATS[actual['format']]
        photo = dict(url=asset, status='approved', width=actual['width'], height=actual['height'],
                     source=item['source'], credit=item.get('credit', ''), license=item['usagePermission'],
                     checks=item['checks'], review=dict(reviewedBy=item['reviewedBy'],
                     reviewedAt=datetime.now(timezone.utc).isoformat(), sourceSha256=actual['sha256'],
                     policyVersion=POLICY['version'], identityConfirmed=True,
                     notes=item['reviewNotes'], technicalMetrics={key: actual[key] for key in ('focusEnergy', 'cleanBorderFraction')}))
        if not previous_record:
            if not product_id.startswith('studio-'):
                raise ValueError('Unknown imported product ID; use a studio identity for new entries')
            source_url = item.get('sourceUrl')
            if source_url and urlparse(source_url).scheme != 'https':
                raise ValueError('Source product URL must use HTTPS')
            previous_record = dict(id=product_id, barcode=None, brand=product['brand'], name=product['name'],
                quantity=str(size) + ' mL', sizeMl=size, concentration=product['concentration'],
                sourceUrl=source_url, reviewStatus='Identity reviewed against photo/source')
        planned.append((item, photo, previous_record))
    if not planned:
        raise ValueError('No visually approved candidates to publish')
    # Validate the whole batch before copying any image or changing the manifest.
    for item, photo, record in planned:
        destination = root / photo['url']
        destination.parent.mkdir(parents=True, exist_ok=True)
        if Path(item['path']).resolve() != destination.resolve():
            shutil.copyfile(item['path'], destination)
        manifest['photos'][record['id']] = photo
        if record['id'] not in records:
            manifest.setdefault('additionalRecords', []).append(record)
            records[record['id']] = record
    temporary = manifest_path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(manifest_path)
    return [record['id'] for _, _, record in planned]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    review = sub.add_parser('assess', help='Inspect technical quality and create a pending review report')
    review.add_argument('images', nargs='+')
    review.add_argument('--out', required=True)
    write = sub.add_parser('publish', help='Copy approved original images and update the website manifest')
    write.add_argument('review')
    write.add_argument('--replace', action='store_true')
    args = parser.parse_args()
    if args.command == 'assess':
        report = assess(args.images)
        Path(args.out).write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
        print(json.dumps({'report': args.out, 'candidates': len(report['candidates']), 'status': 'pending visual review'}))
    else:
        print(json.dumps({'published': publish(json.loads(Path(args.review).read_text()), replace=args.replace)}))
