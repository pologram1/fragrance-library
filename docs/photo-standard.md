# Fragrance photography standard

The user's two Afnan 9 PM Night Out examples set the visual direction. Catalog and collection cards use the clean isolated bottle style. Editorial/lifestyle imagery is appropriate for detail pages and promotional covers after review; it is not automatically substituted for an exact product image.

## Approval requirements

- Correct fragrance and concentration, with packaging identified from the source.
- Complete bottle and cap, natural proportions, no stretching or misleading crops.
- Sharp focus, readable label, controlled lighting and clean white/transparent background.
- No incidental clutter, hand-held snapshots, unrelated boxes, screenshots or intrusive watermarks.
- Enough native pixels for the display size. The supplied approved reference is 375 × 500 and works at the 200-pixel card height without upscaling. New sources should ideally supply 800–1200 pixels on the long edge for larger detail views.
- Known provenance and appropriate usage permission. Open Beauty Facts licensing is not carried over to user-supplied or retailer assets.

Resolution alone does not approve a photo. The review must check the actual image, its product identity, composition and readability. Upscaling a poor source does not make it suitable.

## Implementation

`data/photos.json` is the explicit approval manifest. `photo-standards.js` requires approval status, dimensions, a safe asset URL and all visual-review checks. Raw catalog photo URLs are retained as source candidates but are no longer displayed. Every record remains searchable and addable while its photo is awaiting approval. The photo filter shows only records with approved assets.

The first approved asset is the user's unmodified clean bottle reference, stored locally for Afnan 9 PM Night Out. Its identity, 100 mL size and Extrait de Parfum concentration are transcribed from its label. The richer lifestyle reference was not published as a catalog image.

If the approval manifest fails to load, the application displays placeholders instead of falling back to unreviewed image URLs. Broken or undersized approved assets also use placeholders. Pending images are labeled **Photo coming soon**. Existing collections retain their catalog IDs and acquire approved photos as those IDs are reviewed.

Photo approvals are separate from the public Open Beauty Facts JSON/SQLite database. The manifest can add studio-curated product identities without modifying the imported dataset or implying their pictures have the same license.
