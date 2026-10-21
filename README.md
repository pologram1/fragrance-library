# Fragrance Library

A Polo Studios project by Miguel A. De Jesus. Working product name.

## Run the first version

Open `index.html` in a browser, or serve this directory with `python3 -m http.server 8000` and visit http://localhost:8000. No build step or dependencies are required. Use the same browser and origin to retain saved collections.

## Accounts

Supabase is connected with username/password registration, private per-user collections and cross-device saving. Guest mode remains available. Sign-in waits for the account collection to load; guest bottles can be transferred without replacing existing account entries. Email recovery and Google sign-in are not enabled. See `docs/accounts.md`.

## Implemented

- Collectr-inspired navigation: overview, collection, discover, and wishlist, with bookmarkable hash routes.
- Dashboard purchase costs, quantity-based pricing coverage, and top three fragrances ranked by total replacement value.
- Searchable Open Beauty Facts catalog: 561 product records, 515 photo URLs, 309 distinct brand labels. Records are barcode-specific and can include multiple sizes of one scent.
- Discover filters by brand and photo availability, supports barcode searches, and displays 24 records per page.
- Add fragrance opens catalog search first. Known bottle variants save directly to the selected collection/wishlist in one click. Each capacity is a separate entry with its reviewed photo; incomplete records use the secondary manual-entry flow. Duplicates in the same list are prevented.
- A separate shared price database links checked seller offers automatically to exact bottle identities, concentrations, sizes and bottle types. Daily refresh through GitHub Actions requires no paid API. See `docs/market-prices.md`.
- JSON data for the website plus a SQLite database and reproducible importer. See `docs/catalog.md` and `data/LICENSE.md`.
- Bookmarkable fragrance profiles with sourced notes/stories and direct seller shopping links without affiliate tracking. See `docs/fragrance-discovery.md`.
- Sort collection by name, brand, or total replacement value.

- Add, edit, and remove fragrance variants: brand, name, concentration, bottle size, standard/tester, quantity, owned/wishlist, and optional purchase price.
- Search and filter the collection.
- Enter exact seller product links, prices, availability, review status, and check dates.
- Calculate per-bottle replacement price and quantity-adjusted collection totals.
- Browser storage with JSON backup export/import and input validation.

## Market pricing rules

Eligible offers match the exact bottle variant, are in stock, USD, from a user-reviewed seller, and checked within 7 days. This freshness window is an initial product decision and can be adjusted. One eligible offer per seller hostname is used; the latest checked entry wins.

Market price is the arithmetic average of all eligible reviewed seller offers, including official retail. Each seller domain contributes once. If official retail is the only available source type, the result is labeled official retail. Lowest available price includes all eligible offers. Missing prices are unknown, not zero; totals show coverage and are labeled partial when needed. Tax and shipping are excluded. This is replacement cost, not resale value.

Candidate sellers: FragranceNet, Beauty House, Jomashop, and FragFlex. Exact domains, reputation, regional eligibility, and integration methods require review. Additional reputable sellers may be included. Official brand retail is a fallback for fragrances without reliable discount offers.

## Important limitations

Seller prices are checked snapshots, not instant purchase quotes. Coverage is incomplete; unavailable, mismatched or stale offers are excluded. Prices do not include shipping or tax and are proportional replacement estimates, not used-bottle resale values. Collections save to the current browser in guest mode or privately to an account when signed in. Export backups to keep independent copies.

## Validation

Run `node --test '*.test.js'` and `python scripts/refresh_prices.test.py`. Coverage includes account isolation/save ordering, exact price matching, freshness, source eligibility, direct-add destinations and duplicates, remaining mL valuation, theme switching and photo approval. The live search → wishlist → move-to-collection → reload flow is visually checked after deployment.

## Next milestones

Expand checked seller coverage and exact variant photos; add approved affiliate links and account recovery.


## Photo quality

Only explicitly reviewed photos appear on cards. Community photo URLs are source candidates; unreviewed images are replaced with a clear placeholder. The approved Afnan 9 PM Night Out reference is the first studio-curated product image. See `docs/photo-standard.md`. Run `node photo-standards.test.js` to check the approval gate.

## Photo ingestion workflow

`photo_pipeline.py` assesses batches against your reference, produces review reports, and publishes only visually approved, identity-matched original files. It records review notes and source hashes; any source change requires reassessment. See `docs/photo-review-workflow.md`. The numerical checks flag issues; Codex still visually reviews every approved photo.

## Applied photo review

The catalog now has 674 approved images: 28 existing local originals plus 635 visually reviewed supplier-hosted photos and 11 official Terra Mater editorial photos. All have distinct reviewed SHA-256 hashes. Terra Mater adds 11 fragrances across 12 size entries; the 50 mL San Juan Spritz photo remains held due to a 100 mL label. A batch of 720 supplier candidates was inspected; 85 were held for visual or identity/variant concerns. Source links and review metadata are preserved in `data/photos.json` and `data/supplier-photo-review.json`. Miguel confirmed image reuse approval on 2026-10-14. See `docs/supplier-images.md` for publication and remote-image behavior.
