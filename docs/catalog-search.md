# Catalog identity and search

The app builds a normalized catalog from the existing source files. Brand casing, accents and a small explicit alias list share one display label and filter choice. Original source fields and files remain available.

At this update, 7,249 source records produce 7,240 displayed variants: nine redundant complete records are grouped, all original IDs still resolve, and the brand selector has 695 choices instead of 743. This is conservative grouping, not a claim that every source's product information has been verified.

Only complete records with the same normalized brand/name, concentration, size, bottle type and explicit audience are grouped. Unknown concentration or size stays separate. A source path that explicitly names a men's/women's version or tester is retained as an identity constraint. These seller descriptions are not an assessment of who can wear a fragrance.

The representative prefers an approved photo, and every member ID resolves to that representative. Profile lookup checks member IDs, price matching uses canonical brand identities, and existing private collection IDs remain valid without rewriting personal data. Explicitly conflicting audience and tester offers are excluded. Uncertain identities are not automatically merged.

Search supports accent/punctuation normalization, brand shortcuts (MFK, YSL, JPG), concentration shorthand (EDP, EDT, EDC, extrait), exact mL constraints, barcodes and prefixes. When no exact/prefix result exists, bounded edit distance permits spelling errors and letter transpositions. Numeric tokens and bottle constraints are never fuzzily changed.

The header suggests up to six bottle variants with approved photos where available, concentration, size, type, and current market-price information. Arrow keys select a result, Enter opens it or submits the full query, Escape dismisses suggestions, and a live region announces results. Discover and the collection picker use the same matching engine. Input is debounced and catalog price quotes are cached until the catalog is refreshed.
