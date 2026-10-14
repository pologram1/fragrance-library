# Fragrance Library

A Polo Studios project by Miguel A. De Jesus. Working product name.

## Run the first version

Open `index.html` in a browser, or serve this directory with `python3 -m http.server 8000` and visit http://localhost:8000. No build step or dependencies are required. Use the same browser and origin to retain saved collections.

## Implemented

- Collectr-inspired navigation: overview, collection, discover, and wishlist, with bookmarkable hash routes.
- Dashboard purchase costs, quantity-based pricing coverage, and top three fragrances ranked by total replacement value.
- Four-name starter catalog; the user chooses the exact concentration and size. Generic bottle illustrations are placeholders, not product photographs.
- Sort collection by name, brand, or total replacement value.

- Add, edit, and remove fragrance variants: brand, name, concentration, bottle size, standard/tester, quantity, owned/wishlist, and optional purchase price.
- Search and filter the collection.
- Enter exact seller product links, prices, availability, review status, and check dates.
- Calculate per-bottle replacement price and quantity-adjusted collection totals.
- Browser storage with JSON backup export/import and input validation.

## Market pricing rules

Eligible offers match the exact bottle variant, are in stock, USD, from a user-reviewed seller, and checked within 7 days. This freshness window is an initial product decision and can be adjusted. One eligible offer per seller hostname is used; the latest checked entry wins.

Market price is the median of eligible discount offers. When none exist, use the median of eligible official-retail offers. Lowest available price includes all eligible offers. Missing prices are unknown, not zero; totals show coverage and are labeled partial when needed. Tax and shipping are excluded. This is replacement cost, not resale value.

Candidate sellers: FragranceNet, Beauty House, Jomashop, and FragFlex. Exact domains, reputation, regional eligibility, and integration methods require review. Additional reputable sellers may be included. Official brand retail is a fallback for fragrances without reliable discount offers.

## Important limitations

No live pricing feeds, accounts, server database, or independently verified seller registry yet. Seller review and offer matching are user attestations in this prototype. The application starts empty and contains no invented market prices. Data is stored only in the current browser; export backups before switching devices or clearing storage. Only full-bottle replacement prices are calculated.

## Validation

Run `node pricing.test.js` for median, retail fallback, stale/future offers, seller deduplication, and eligibility checks. Browser interactions still need visual QA.

## Next milestones

1. Review seller APIs/feeds and permissions.
2. Build a verified fragrance catalog and seller registry.
3. Add backend price retrieval with variant matching and freshness tracking.
4. Add authentication and cross-device collection storage.
