# Shared market-price database

`data/prices.json` is the browser reference store; `data/prices.sqlite` provides a queryable public seller-price table. Neither contains user collections. The refresh job generates both from exact variants on Perfume Box, Olfactory Factory LLC, and Terra Mater Perfumes. Products are limited to already published catalog source links and reviewed identities. Official-brand prices are retail fallback.

Prices are sale prices, not crossed-out compare-at MSRP. Product/variant IDs, concentration (when explicitly present), standard/tester type and known capacity must match; unknown or conflicting sizes are excluded. Each offer retains its exact seller URL, availability and check date. Photos are not generated, resized into another bottle shape or reused to invent a new size.

The app joins by normalized brand/name, concentration, size and bottle type. It uses the latest eligible offer per seller domain, the median discount-seller price, or official retail fallback. One source is displayed as one source, not an invented multi-seller average. Offers older than seven days, future checks and out-of-stock offers are excluded. Shipping, taxes and personal coupons are excluded.

`.github/workflows/prices.yml` refreshes daily and supports manual dispatch. The first refresh is triggered when the importer/workflow is committed. A failed source retains its previous dated data; failed or missing matches are never marked freshly checked. Completion triggers a Pages rebuild so generated price data is actually published. A total failure without any existing price data fails the job.

`market-prices.js` joins shared prices at display/calculation time; private stored offers remain separate. Collection price history captures the first observed price and subsequent movements. Existing and newly added bottles use the latest snapshot after reloading the app. Unpriced variants remain addable and show Price pending.
