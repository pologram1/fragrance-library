"""Stage an authorized CSV product feed for manual fragrance-photo review.

Never scrapes storefronts, approves images, or modifies the live catalog.
CSV fields: seller_sku,brand,fragrance,concentration,size_ml,image_url,product_url.
Permission JSON: seller,granted:true,evidence,scope:'catalog-images'.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse

from auto_catalog import download
import photo_pipeline as photos

SELLERS = {
    'fragrancenet': {'productHosts': {'www.fragrancenet.com', 'fragrancenet.com'},
                    'imageHosts': {'www.fragrancenet.com', 'fragrancenet.com'}},
    'olfactoryfactory': {'productHosts': {'www.olfactoryfactoryllc.com', 'olfactoryfactoryllc.com'},
                        'imageHosts': {'www.olfactoryfactoryllc.com', 'olfactoryfactoryllc.com', 'cdn.shopify.com'}},
    'perfumebox': {'productHosts': {'perfumebox.com', 'www.perfumebox.com', 'theperfumebox.com', 'www.theperfumebox.com'},
                  'imageHosts': {'perfumebox.com', 'www.perfumebox.com', 'theperfumebox.com', 'www.theperfumebox.com', 'cdn.shopify.com'}}}
CONCENTRATIONS = {'Eau de Parfum', 'Eau de Toilette', 'Eau de Cologne', 'Extrait de Parfum', 'Parfum'}
REQUIRED = {'seller_sku', 'brand', 'fragrance', 'concentration', 'size_ml', 'image_url', 'product_url'}


def permission(path, seller):
    document = json.loads(Path(path).read_text())
    if document.get('seller') != seller or document.get('granted') is not True or document.get('scope') != 'catalog-images':
        raise ValueError('Supplier image permission or an applicable licensed feed agreement is required')
    if not isinstance(document.get('evidence'), str) or len(document['evidence'].strip()) < 20:
        raise ValueError('Reference the actual permission or licensed-feed agreement; do not infer it from public access')
    return document


def product(row, seller):
    for key in REQUIRED:
        if not isinstance(row.get(key), str) or not row[key].strip():
            raise ValueError('Missing ' + key)
    if row['concentration'] not in CONCENTRATIONS:
        raise ValueError('An exact supported concentration is required')
    size = float(row['size_ml'])
    if not 1 <= size <= 2000:
        raise ValueError('Invalid bottle size')
    for field, hosts in [('image_url', 'imageHosts'), ('product_url', 'productHosts')]:
        parsed = urlparse(row[field])
        if parsed.scheme != 'https' or parsed.hostname not in SELLERS[seller][hosts] or parsed.username or parsed.password:
            raise ValueError('Untrusted ' + field)
    if any(len(row[key].strip()) > 100 for key in ('brand', 'fragrance')):
        raise ValueError('Product identity is too long')
    identity = '\n'.join([row['brand'].strip().casefold(), row['fragrance'].strip().casefold(), row['concentration'], str(size)])
    return {'id': 'studio-feed-' + hashlib.sha256(identity.encode()).hexdigest()[:24],
            'brand': row['brand'].strip(), 'name': row['fragrance'].strip(),
            'concentration': row['concentration'], 'sizeMl': size,
            'identityConfirmed': False}


def stage(feed, seller, permission_file, out, limit=600):
    if seller not in SELLERS:
        raise ValueError('Unknown supplier')
    authorization = permission(permission_file, seller)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    approved_manifest = json.loads((photos.ROOT / 'data/photos.json').read_text())
    approved_hashes = {p.get('review', {}).get('sourceSha256') for p in approved_manifest['photos'].values()}
    seen, hashes, candidates, rejected = set(), set(), [], []
    with Path(feed).open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if not REQUIRED.issubset(set(reader.fieldnames or [])):
            raise ValueError('Feed must have the documented CSV columns')
        for number, row in enumerate(reader, 2):
            if number > min(6000, max(1, limit) * 3) + 1:
                break
            if len(candidates) >= max(1, min(2000, limit)):
                break
            try:
                record = product(row, seller)
                if record['id'] in seen:
                    continue
                seen.add(record['id'])
                path = out / (record['id'] + '.original')
                download(row['image_url'], path, urlparse(row['image_url']).hostname, photos.POLICY['maximumFileBytes'])
                item = photos.assess([path])['candidates'][0]
                if item['hardFailures']:
                    rejected.append({'row': number, 'sellerSku': row['seller_sku'], 'reason': item['hardFailures']})
                    continue
                if item['sha256'] in hashes or item['sha256'] in approved_hashes:
                    item['warnings'].append('Duplicate photo bytes: inspect variant mapping and do not count this as a new unique image')
                hashes.add(item['sha256'])
                item.update(product=record, source=seller, sourceUrl=row['product_url'],
                            candidateImageUrl=row['image_url'], sellerSku=row['seller_sku'],
                            usagePermission=authorization['evidence'], permissionScope=authorization['scope'])
                # Identity and every visual check remain false until actual review.
                candidates.append(item)
            except Exception as error:
                rejected.append({'row': number, 'reason': type(error).__name__})
    report = {'version': 1, 'policyVersion': photos.POLICY['version'], 'supplier': seller,
              'candidates': candidates, 'rejected': rejected,
              'targetApprovedImages': 500, 'currentlyApprovedImages': len(approved_manifest['photos']),
              'distinctCandidateHashes': len(hashes), 'status': 'pending manual visual review'}
    (out / 'review.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    return {'staged': len(candidates), 'distinctCandidatePhotos': len(hashes), 'rejected': len(rejected),
            'published': 0, 'report': str(out / 'review.json')}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--feed', required=True)
    parser.add_argument('--seller', choices=SELLERS, required=True)
    parser.add_argument('--permission-file', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--limit', type=int, default=600)
    args = parser.parse_args()
    print(json.dumps(stage(args.feed, args.seller, args.permission_file, args.out, args.limit)))
