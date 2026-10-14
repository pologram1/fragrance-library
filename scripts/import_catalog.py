"""Build a reusable fragrance catalog from the Open Beauty Facts public export.

Usage: python3 scripts/import_catalog.py --dump /path/products.csv.gz
Optional: --api-pages /path/page1.json /path/page2.json ...
Only public product data is imported. No collection or customer records.
"""
import argparse
import csv
import gzip
import hashlib
import json
import re
import sqlite3
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://static.openbeautyfacts.org/data/en.openbeautyfacts.org.products.csv.gz'


def clean(value):
    return re.sub(r'\s+', ' ', str(value or '')).strip()


def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.lower()) if not unicodedata.combining(c))


def is_fragrance(row):
    cats = normalize(clean(row.get('categories_tags')) + ' ' + clean(row.get('categories')))
    name = normalize(clean(row.get('product_name')))
    # Avoid creams described as scented, intimate washes, toilet paper, and deodorants.
    excluded = r'\bset\b|\bcoffret\b|\bgift\b|\bkit\b|shampoo|shampoing|deodor|deodoris|toiletten|papier|toilet paper|suncare|sunscreen|solaire|soap|savon|shower|douche|lotion|lait |cream|creme|hand wash|detergent|lessive|intime|bath|bain|gel |after.?shave|rasage|bougie|candle|diffuser|desodoris|home fragrance'
    if re.search(excluded, cats + ' ' + name):
        return False
    category_match = bool(re.search(r'perfumes?|parfums?|eau[x]?[- ]de[- ](?:toilette|cologne)|\bcologne\b', cats))
    name_match = bool(re.search(r'eau de (?:parfum|toilette|cologne)|\b(?:perfume|parfum|cologne|edp|edt|fragrance mist|brume parfumee)\b', name))
    return category_match or name_match


def convert(row):
    brand, name, code = clean(row.get('brands')), clean(row.get('product_name')), clean(row.get('code'))
    if not brand or not name or len(brand) > 100 or len(name) > 100 or not re.fullmatch(r'\d{4,14}', code) or not is_fragrance(row):
        return None
    quantity = clean(row.get('quantity'))
    # Only an explicit single mL quantity is prefilled; multipacks/ounces need confirmation.
    m = re.fullmatch(r'(\d+(?:[.,]\d+)?)\s*ml[.]?', quantity, re.I)
    size = float(m.group(1).replace(',', '.')) if m else None
    if size is not None and not 1 <= size <= 2000:
        size = None
    text = normalize(name + ' ' + clean(row.get('categories_tags')) + ' ' + clean(row.get('categories')))
    concentration = None
    for pattern, label in [
        (r'extrait', 'Extrait de Parfum'),
        (r'eau[- ]de[- ]parfum|\bedp\b', 'Eau de Parfum'),
        (r'eau[- ]de[- ]toilette|\bedt\b', 'Eau de Toilette'),
        (r'eau[- ]de[- ]cologne', 'Eau de Cologne')]:
        if re.search(pattern, text):
            concentration = label
            break
    image = clean(row.get('image_front_url') or row.get('image_url'))
    if urlparse(image).scheme != 'https' or urlparse(image).hostname != 'images.openbeautyfacts.org':
        image = None
    return dict(id='obf-' + code, barcode=code, brand=brand, name=name, quantity=quantity,
                sizeMl=size, concentration=concentration, image=image,
                sourceUrl='https://world.openbeautyfacts.org/product/' + code,
                imageLicense='CC-BY-SA-3.0' if image else None,
                imageCredit='Open Beauty Facts contributors' if image else None,
                reviewStatus='community-sourced', updatedAt=clean(row.get('last_modified_datetime')) or None)


def build(dump_path, api_paths):
    rows = {}
    with gzip.open(dump_path, 'rt', encoding='utf-8') as stream:
        for row in csv.DictReader(stream, delimiter='\t'):
            record = convert(row)
            if record:
                rows[record['id']] = record
    for path in api_paths:
        for row in json.loads(Path(path).read_text())['products']:
            if isinstance(row.get('categories_tags'), list):
                row['categories_tags'] = ','.join(row['categories_tags'])
            record = convert(row)
            if record:
                # Preserve known metadata from the dump if the lighter API lacks it.
                previous = rows.get(record['id'], {})
                rows[record['id']] = {key: value if value is not None else previous.get(key) for key, value in record.items()}
    records = sorted(rows.values(), key=lambda r: (not bool(r['image']), normalize(r['brand']), normalize(r['name']), r['id']))
    meta = dict(version=1, generatedAt=datetime.now(timezone.utc).isoformat(), source='Open Beauty Facts',
                sourceUrl='https://world.openbeautyfacts.org', databaseLicense='ODbL-1.0',
                contentsLicense='DbCL-1.0', imageLicense='CC-BY-SA-3.0',
                importSource=SOURCE, dumpSha256=hashlib.sha256(Path(dump_path).read_bytes()).hexdigest(),
                records=len(records), withImages=sum(bool(r['image']) for r in records),
                brands=len({r['brand'] for r in records}),
                note='Community product records; multiple sizes/barcodes may represent the same fragrance. Confirm bottle details before adding.')
    out = ROOT / 'data'
    out.mkdir(exist_ok=True)
    (out / 'catalog.json').write_text(json.dumps(dict(metadata=meta, fragrances=records), ensure_ascii=False, separators=(',', ':')) + '\n')
    database = out / 'catalog.sqlite'
    database.unlink(missing_ok=True)
    with sqlite3.connect(database) as db:
        db.executescript((out / 'schema.sql').read_text())
        db.executemany('INSERT INTO fragrances VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [tuple(r[k] for k in ('id','barcode','brand','name','quantity','sizeMl','concentration','image','sourceUrl','imageLicense','imageCredit','reviewStatus','updatedAt')) + (normalize(r['brand'] + ' ' + r['name']),) for r in records])
        db.execute('INSERT INTO metadata VALUES (?,?)', ('catalog', json.dumps(meta)))
    print(json.dumps(meta, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dump', required=True)
    parser.add_argument('--api-pages', nargs='*', default=[])
    args = parser.parse_args()
    build(args.dump, args.api_pages)
