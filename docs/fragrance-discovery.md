# Fragrance profiles and direct shopping concept

Every catalog card and search-picker item has an Explore fragrance link. The bookmarkable `#fragrance/<catalog-id>` view shows the reviewed product photo, exact concentration/capacity, current arithmetic-average bottle estimate, collection/wishlist actions, notes, story and seller listings. The photo preview links to the same view. Opening a profile never adds a bottle or begins a purchase.

`data/fragrance-profiles.json` starts with 20 sourced profiles: 10 Terra Mater fragrances and 10 common Lattafa, Creed, Dior and Maison Francis Kurkdjian versions. Each profile carries explicit catalog IDs, concentration, source URLs and check dates. Source note pyramids retain top/heart/base groups; brands that only publish highlighted notes display Featured notes. Release years and creators are shown only when sourced. Unresearched versions show pending content, not inferred histories. Tabonuco Incense is held because its source body describes Berry Rose. Profile summaries are original paraphrases, not copied marketing text.

Seller cards use the separate shared price store. Exact matching, reviewed USD offers are deduplicated by seller domain. Fresh in-stock prices display a Buy from seller link and checked date. Stale/out-of-stock entries show their status and a View seller listing link without presenting the old price as current. Existing exact catalog product links at the connected stores remain usable when no checked quote is available. Open Beauty Facts records are never presented as retailers.

All links are ordinary HTTPS links opened with `noopener noreferrer`. Credentials and unsafe schemes are rejected. Referral parameters and URL fragments are stripped; bottle selectors such as `variant`, `sku` and `pid` are preserved. There are no affiliate tags, commission scripts, paid placement, checkout or payment collection. The page explicitly states that Polo Studios earns no commission. Future affiliate monetization is outside this implementation.

Run `node --test '*.test.js'` for profile identity, tracking removal, seller deduplication/freshness and existing account/collection regressions.
