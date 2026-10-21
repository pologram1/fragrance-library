# Supplier catalog images

Miguel confirmed on 2026-10-14 that images from FragranceNet, Olfactory Factory LLC and Perfume Box are approved for this app. This is recorded as user-confirmed reuse permission, not a Creative Commons license or independently verified supplier agreement.

Published catalog: **674 approved photos**, including **635 supplier photos** and **11 official Terra Mater editorial photos**. All 674 have distinct original SHA-256 hashes. The supplier batch reviewed 720 candidates; 85 were held after visual/identity checks. Detailed provenance is in `data/supplier-photo-review.json`.

This import uses public product metadata from Perfume Box and Olfactory Factory LLC. Only factual product identity and source links are stored; merchant descriptions are not republished. FragranceNet remains an available source for future imports.

Each published photo has a source URL, original SHA-256, native dimensions, review date, product identity and visual checks. Review excludes box-only shots, lifestyle compositions, obvious variant conflicts, generated images, samples, gift sets and non-perfume products. Supplier variant metadata provides concentration and nominal bottle capacity; ounce-only sizes use standard marketed mL equivalents, not mathematical fluid-ounce conversion. No barcode is invented.

Supplier photos remain hosted at their original HTTPS CDN URLs. This keeps the repository small and requires no paid image API. Source credit links appear on the product cards. If a supplier removes an image, or its native dimensions fail the app's checks, a placeholder appears. A URL can change after review; the recorded hash identifies the bytes that were inspected, not an ongoing guarantee of the remote asset.

## Publishing reviewed images

The existing assessment workflow remains unchanged. Download originals, assess their native dimensions and integrity, then visually inspect each image against its source identity and the catalog reference. An assessment alone never approves a photo.

A reviewed report may include `candidateImageUrl` and be published with:

```
python scripts/photo_pipeline.py publish review.json --remote
```

Remote publication rechecks the local reviewed original and requires an allowed supplier HTTPS host. All visual, identity, source and permission fields remain mandatory. Without `--remote`, the publisher copies the unchanged original into the repository as before.

This import adds catalog imagery, not a live pricing feed. Market valuation still requires matching, reviewed seller offers. Remaining mL and consumption-related value changes are already supported by the app.

The user-requested Terra Mater import on 2026-10-21 uses a separate official-brand editorial composition review under policy v2. Its photos retain their styled backgrounds and are not marked as clean white-background assets. See `data/terra-mater-review.json` and `docs/photo-standard.md`.
