# Retailer enrichment — October 22, 2026

The catalog adds 6,040 retailer-stated bottle variants to the existing 1,209 records. The supplementary price reference contains 6,662 exact variants, with multiple seller listings for 1,183. There are 1,092 additional attributed note profiles. Existing curated histories and official-brand profiles take precedence over imported lists.

The import examined 5,754 Perfume Box products, 5,028 Olfactory Factory products and the first 40 public FragFlex catalog pages (9,933 products). FragranceNet contributes 58 bottle observations from 23 public product pages. Three Jomashop listings were checked in the rendered browser. These are finite, checked snapshots, not a claim that every fragrance or retailer listing has been imported.

Only stated capacities and concentrations are admitted. Testers, gift sets, samples, refills, oils, body products and ambiguous variants are excluded. Standard bottles are grouped by brand, name, concentration, mL and bottle type. The client counts each seller hostname once, excludes unavailable and stale quotes, and calculates the arithmetic average of eligible USD prices. Explicitly advertised public coupons can contribute a price, with the condition displayed beside the seller. Personal, membership and order-total coupons are excluded. Shipping and tax are excluded.

FragranceNet numeric SKU fragments are retained in shopping links so the selected capacity can be opened. Other URL fragments and tracking parameters are removed. Jomashop observations retain their actual check date and expire from valuations after seven days; the importer does not pretend that its JavaScript pages were automatically rechecked.

GitHub's existing daily price workflow now refreshes the supported public retailer catalogs, notes and FragranceNet listings. A failed source keeps its original observation date. Cached product responses older than six hours cannot be stamped as fresh. The import preserves existing supplemental IDs and uses a bounded 6,000-variant storefront budget plus explicitly checked product observations. No paid API is used.

Fifty new photos were visually approved from 93 candidates; 43 were held for placeholders, box-only pictures, capacity/concentration discrepancies or insufficient identity confirmation. The approved manifest now contains 724 photos. Original supplier images remain unmodified and remotely hosted. Review decisions and hashes are in `data/enrichment-photo-review.json` and `data/enrichment-photo-review-diverse.json`. Technical screening never substitutes for visual approval.

## Home page

The new collection workspace has a market-value panel, observed-price history ranges, bottle and wishlist totals, usage and market-movement statistics, a wishlist preview, discovery shelves and global search. The chart uses current quantities and remaining mL against observed price history; it does not invent values before tracking begins or imply that it records historical purchases or usage. With fewer than two observed days, the page explains when history will become available.
