# Photo review workflow for Codex

This workflow lets Codex assess, review and add photos in the style Miguel selected. The clean Afnan product shot is the catalog reference. His richer lifestyle example guides editorial artwork only.

## 1. Gather candidates

Use original images supplied by Miguel, approved retailer feeds or other sources with appropriate usage permission. Preserve each source and its rights information. Match an existing product ID or establish an exact new studio identity from the bottle label. Do not use generated bottle illustrations as verified product photos.

## 2. Technical assessment

Run from the repository:

```sh
python3 scripts/photo_pipeline.py assess /path/photo1.png /path/photo2.jpg --out /path/photo-review.json
```

The report records actual dimensions, file integrity, SHA-256, native format, diagnostic edge detail relative to the reference, and white/transparent border coverage. Tiny, invalid or oversized files cannot be published. Sharpness and background measurements create review warnings; they cannot prove that a label is readable or a product is correct. Assessments do not automatically approve any candidate.

## 3. Mandatory visual review

Open **every candidate being approved** with `view_image`. Compare it with `assets/fragrances/afnan-9pm-night-out.png` and inspect:

- Sharp bottle edges and readable printing.
- Correct fragrance, concentration and pictured size.
- Entire bottle and cap, with natural width/height proportions.
- Controlled lighting, no distracting clutter, no intrusive watermark.
- Clean isolated presentation for a catalog card.

Record a rejection reason or set `verdict: "approved"`, all five `checks` to true, and add `reviewedBy`, `reviewNotes`, `source` and `usagePermission`. Fill `product` with `id`, `brand`, `name`, `concentration`, `sizeMl`, and `identityConfirmed: true`. Product details must match the existing record; a photo of a different concentration or size needs its own correct identity. Add `credit` and an HTTPS `sourceUrl` when applicable.

Only approve after visually inspecting the actual source image. Diagnostics and filename similarity are not substitutes for this review. Watermarked lifestyle compositions can guide design without being published as product assets.

## 4. Publish the reviewed originals

```sh
python3 scripts/photo_pipeline.py publish /path/photo-review.json
```

The publisher rechecks source hashes, minimum dimensions, every review criterion, identity matching and provenance before copying unmodified images into `assets/fragrances/`. It updates `data/photos.json` with the reviewer, review date, diagnostics and source hash. Existing approved photos require `--replace` for a different image; identical originals reuse the existing asset.

Run `node photo-standards.test.js`, `python3 scripts/photo_pipeline.test.py` and relevant collection checks, then commit the new image assets and manifest through the existing GitHub Pages workflow. Confirm the deployed build. The public product cards read the approved manifest automatically.

## Limits

The numerical diagnostics are triage signals, not an aesthetic rating or a learned classifier. They cannot reliably identify the perfume, recognize all watermarks, judge authenticity, or certify reuse permission. Those decisions remain part of Codex's source and visual review. The workflow assesses and publishes original photos; it does not retouch, crop, remove watermarks or upscale them.
