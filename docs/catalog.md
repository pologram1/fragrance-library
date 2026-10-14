# Fragrance catalog

## Current release

561 public fragrance product records with 515 photo URLs and 309 distinct brand labels. This is an initial community-sourced catalog, not a complete fragrance encyclopedia. Different barcode records can represent sizes of the same scent; brand labels sometimes include distributors or aliases. Images can show boxes, older packaging, samples, or bottles. They are reference photos, not a promise that a user-selected variant has identical packaging.

The app searches names, brands and barcodes with accent-insensitive matching; offers brand and photo filters; and paginates 24 records at a time. Adding an item prefills explicit concentration and single mL quantities where known. Unknown fields require user selection. Each saved collection item carries the catalog ID to display the reference photo. Existing browser collections and JSON backups remain compatible.

## Files

- `data/catalog.json`: public browser-readable catalog, metadata and provenance.
- `data/catalog.sqlite`: equivalent SQLite database for later backend work.
- `data/schema.sql`: indexed product schema with stable barcode-derived IDs.
- `data/LICENSE.md`: database and image attribution and license links.
- `scripts/import_catalog.py`: import/normalization pipeline using Python's standard library.

## Source and reproduction

The initial import used the Open Beauty Facts public compressed CSV export retrieved on 2026-10-14, plus all five pages of its `en:perfumes` API search (445 records before filtering). The JSON metadata records the source export SHA-256. The public dataset is community-maintained: expect errors and gaps, and inspect source records when correcting them.

Download https://static.openbeautyfacts.org/data/en.openbeautyfacts.org.products.csv.gz, then run:

```sh
python3 scripts/import_catalog.py --dump /path/to/products.csv.gz
```

Optionally add `--api-pages /path/page1.json /path/page2.json ...` to supplement the export with more recent search records. Query `https://world.openbeautyfacts.org/api/v2/search?categories_tags=en:perfumes&page_size=100&page=1&fields=code,product_name,brands,quantity,categories,categories_tags,image_front_url,url`, advance page until the reported total is exhausted, and identify the application in the User-Agent. Rebuilds can change counts; stable IDs allow saved collections to reconnect.

Filtering requires a name, brand and usable barcode; excludes obviously unrelated cosmetics, toilet paper, home fragrances, multipack/gift sets, aftershaves and deodorants; and retains fragrance-category or explicit fragrance-name matches. Concentration is inferred only from explicit wording, and size only from a single mL quantity. These hints still require confirmation.

## Expansion

The next coverage source should be approved retailer product feeds, including images under each seller's permitted usage. Keep each source's licensing and provenance separate; match fragrance, concentration, size, barcode and tester status before linking offers. Do not import ratings, descriptions or photographs from commercial fragrance directories merely because a third-party scrape is downloadable.

Current catalog data does not include live prices, scent notes, perfumers or ratings. Do not invent those fields. The SQLite catalog is public reference data; browser-local collections are not uploaded to it.
