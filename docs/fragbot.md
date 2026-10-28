# FragBot

FragBot replaces the embedded Polo Studios assistant on The Fragrance Library. It is a dedicated, first-party fragrance search and conversation interface. The Polo Studios portfolio assistant is unchanged.

## What it can do

- Find catalog fragrances by name, brand, exact size/concentration, and bounded spelling correction.
- Match listed notes or broad scent directions and filter by category and an eligible-price budget.
- Compare two named bottles, showing their exact matched variants and available notes.
- Answer follow-up questions about a selected bottle's notes, sourced story, estimate, and seller listings.
- Explain collection/wishlist controls, remaining-mL valuation, concentration formats, and account flows.

Example prompts: “Find Dior Sauvage EDP 100ml”, “Compare Sauvage vs Aventus”, “Recommend Arabic perfumes under $60”, “Find fragrances with coconut”, and “What are its notes?” Use **Ask about this bottle** on a result to establish an exact follow-up context.

## Honest boundaries

This implementation is a deterministic, catalog-grounded assistant, not a general-purpose generative model or a connection to ChatGPT. It has no live web browsing and cannot guarantee answers to arbitrary fragrance questions. Unknown notes, history, and fresh prices remain unknown. It does not guess longevity, personal preference, investment returns, or undiscovered products.

No paid API, model download, backend inference, or per-message billing is introduced. Future generative AI would require a separately selected model/service and deployment plan; never put an API secret into GitHub Pages source.

## Data and privacy

`fragbot-core.js` contains the testable matching/conversation logic. `fragbot.js` renders text with DOM text nodes, validates outgoing URLs, and uses a native dialog with focus restoration and Escape support. `fragbot.css` inherits the library theme.

The app exposes `FragBotLibrary.snapshot()` and `prepareProfiles(ids)` as a public-catalog-only adapter. Its snapshot contains catalog identities, approved photo references/credits, checked seller evidence, and sourced profiles. No account credentials, saved collection data, email addresses, collection storage keys, or mutation functions are provided. Questions are not sent to an external model. Profile loading requests only static public profile buckets; broad note recommendations load the note profiles on demand and reuse the page cache.

Conversation is kept in memory on the current page only. **New chat** clears the transcript and follow-up context; reloading also clears it. Collection changes happen through normal app controls, never through chatbot commands.

All price eligibility remains in the existing pricing engine, including seven-day freshness, seller deduplication, exact bottle matching, stock and review checks. Bottles without eligible estimates are excluded from budget recommendations.

## Validation

Run `node --test ./*.test.js`. FragBot checks cover natural-language search, exact variants, misspellings, source-grounded follow-ups, comparisons, note/budget matches, missing prices, catalog failures, unsupported prompts, and the public-only adapter/deployment wiring.
