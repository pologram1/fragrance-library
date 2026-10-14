"""Free daily catalog refresh and technical photo screening.
Visual approval is manual. This script never calls a paid AI service or publishes images.
"""
import argparse
import json
import os
import re
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import import_catalog
import photo_pipeline as photos

ROOT = photos.ROOT


def download(url, destination, host, maximum):
    if urlparse(url).scheme != 'https' or urlparse(url).hostname != host:
        raise ValueError('Untrusted source URL')
    with urlopen(Request(url, headers={'User-Agent': 'PoloStudiosFragranceLibrary/1.0'}), timeout=60) as response:
        if urlparse(response.url).scheme != 'https' or urlparse(response.url).hostname != host:
            raise ValueError('Untrusted redirect')
        data = response.read(maximum + 1)
    if len(data) > maximum:
        raise ValueError('Source exceeds download limit')
    Path(destination).write_bytes(data)


def run(limit=10, refresh=True):
    limit = max(0, min(10, limit))
    log_path = ROOT / 'data/photo-review-log.json'
    log = json.loads(log_path.read_text())
    audits = {r['id']: r for r in log['candidates']}
    manifest = json.loads((ROOT / 'data/photos.json').read_text())
    summary = {'catalogRefreshed': False, 'screened': 0, 'aiRequests': 0, 'published': 0,
               'reviewMode': 'manual_visual_approval', 'errors': []}
    with tempfile.TemporaryDirectory(prefix='polo-catalog-') as temporary:
        temp = Path(temporary)
        if refresh:
            dump = temp / 'products.csv.gz'
            download(import_catalog.SOURCE, dump, 'static.openbeautyfacts.org', 100_000_000)
            import_catalog.build(dump, [], preserve=True)
            summary['catalogRefreshed'] = True
        records = json.loads((ROOT / 'data/catalog.json').read_text())['fragrances']
        queue = [r for r in records if r.get('image') and r['id'] not in manifest['photos']]
        # Screen previously untouched candidates first, then cycle through pending sources.
        queue.sort(key=lambda r: (audits.get(r['id'], {}).get('screenedAt', ''), r['id']))
        for record in queue:
            previous = audits.get(record['id'], {})
            original = re.sub(r'\.(?:\d+)\.(jpg|png|webp)$', r'.full.\1', record['image'])
            # Terminal reviews are retried only if the source URL changes.
            if previous.get('status') in ('approved', 'rejected', 'held_for_review') and previous.get('sourceImageUrl') in (original, record['image']):
                continue
            if summary['screened'] >= limit:
                break
            summary['screened'] += 1
            image_path = temp / (record['id'] + '.image')
            try:
                try:
                    download(original, image_path, 'images.openbeautyfacts.org', photos.POLICY['maximumFileBytes'])
                    source = original
                except (HTTPError, ValueError):
                    download(record['image'], image_path, 'images.openbeautyfacts.org', photos.POLICY['maximumFileBytes'])
                    source = record['image']
                item = photos.assess([image_path])['candidates'][0]
                audit = {k: v for k, v in item.items() if k in
                         ('sha256', 'width', 'height', 'focusRatioToReference', 'cleanBorderFraction', 'hardFailures', 'warnings')}
                audit.update(id=record['id'], sourceUrl=record['sourceUrl'], sourceImageUrl=source,
                             status='rejected' if item['hardFailures'] else 'pending_visual_review',
                             screenedAt=datetime.now(timezone.utc).isoformat())
                audits[record['id']] = audit
                if item['hardFailures']:
                    continue
            except Exception as error:
                # Error bodies/headers may include credentials: record only exception class.
                summary['errors'].append({'id': record['id'], 'error': type(error).__name__})
    log.update(reviewedAt=datetime.now(timezone.utc).isoformat(), candidates=list(audits.values()),
               summary=dict(Counter(r['status'] for r in audits.values())), lastAutomation=summary)
    log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False) + '\n')
    summary['catalogRecords'] = len(records)
    summary['approvedPhotos'] = len(json.loads((ROOT / 'data/photos.json').read_text())['photos'])
    summary_text = json.dumps(summary, indent=2)
    print(summary_text)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as stream:
            stream.write('### Fragrance catalog automation\n```json\n' + summary_text + '\n```\n')
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int, default=10)
    parser.add_argument('--no-refresh', action='store_true')
    args = parser.parse_args()
    run(args.limit, not args.no_refresh)
