# Supplier image import: 500 approved-image target

Current approved images: 28. Additional unique approved images needed: 472. Product rows, variants, downloaded candidates and duplicates do not count as verified images.

## Selected suppliers

| Supplier | Current route | Publication status |
| --- | --- | --- |
| FragranceNet | Obtain written image-use authorization or a licensed affiliate product feed | Waiting for permission/feed |
| Olfactory Factory LLC | Request a feed and written image-use authorization through its affiliate contact | Waiting for permission/feed |
| Perfume Box | Request its offered product datafeed and permission covering a fragrance collection app | Waiting for permission/feed |

Source pages reviewed on 2026-10-14:
- https://www.fragrancenet.com/help/terms_of_use — sections 3 and 4 restrict content reuse without written approval.
- https://www.olfactoryfactoryllc.com/policies/terms-of-service — section 2 restricts copying without express written permission; section 12 also addresses scraping.
- https://perfumebox.com/pages/dropshipping — offers, on request, a product datafeed including product images. This does not establish permission for an unrelated collection app.
- https://perfumebox.com/pages/terms-condition — reviewed; no blanket catalog-image license identified.

A publicly accessible image or JSON endpoint does not establish an image reuse license. Affiliate membership also does not establish an image license unless the agreement grants that use. No supplier images were published from these sources in this step.

## Concrete request to the supplier

Request a product feed containing SKU, barcode if available, brand, fragrance name, concentration, exact bottle size in mL, bottle type, high-resolution image URL, product URL, and attribution requirements. Ask for permission to display product photos in Fragrance Library, a Polo Studios collection/discovery app, and whether images may be cached in the public GitHub repository. Clarify permission for current and future commercial/affiliate use, storage requirements, feed refresh limits, and revocation handling. A feed intended solely for a dropshipping store may have a different permitted scope.

Prefer full bottle/cap shots on white or transparent backgrounds. Need at least 472 new unique photos passing both technical and actual visual review. Prioritize Sauvage variants, Bleu de Chanel, YSL Y/Libre, Armani, Versace, Rabanne, Lattafa, Afnan, Armaf, Rasasi, Maison Alhambra, Creed, Parfums de Marly, Xerjoff, Initio and Maison Francis Kurkdjian.

## Importing an authorized feed

Normalize the supplied feed to CSV with these headers:

```
seller_sku,brand,fragrance,concentration,size_ml,image_url,product_url
```

Keep an actual permission record locally, outside public GitHub if it contains private correspondence:

```
{"seller":"perfumebox","granted":true,"scope":"catalog-images","evidence":"Reference to the actual supplier permission or applicable feed license"}
```

The example is a format specification, not permission. Do not mark granted true without actual authorization.

Run:

```
python scripts/import_seller_feed.py --seller perfumebox --feed authorized-feed.csv --permission-file permission.json --out /tmp/supplier-photo-review --limit 600
```

This downloads authorized candidate originals, rejects invalid URLs/metadata and technical failures, detects duplicate hashes, and creates `review.json`. It does not modify the live catalog or publish images. Product identity and all visual approval checks remain pending.

Inspect each original against the existing quality reference. Confirm the exact fragrance/concentration/size and full bottle/cap, clear label, focus, natural proportions and clean background. Record reviewer, checks, identityConfirmed and notes only after inspection. Then use `photo_pipeline.py publish` through the existing reviewed workflow. Preserve source credit and permission scope. The approved image manifest count is the completion criterion, not import row count.

No paid API or automated AI reviewer is required by this importer.
