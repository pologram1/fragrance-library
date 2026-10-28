# Home page polish and design studies

The production cover uses a code-drawn architectural mark instead of an isolated product photo. It has no hero image download or dependency on available market prices. The three alternatives at `templates.html` are responsive design studies; selecting one changes only the preview, never an account preference or collection.

- **Atelier Noir:** charcoal, warm ivory, restrained brass, and a gallery arch.
- **Deco Vert:** forest green, champagne, stepped geometry, and an architectural frame.
- **Maison Editorial:** paper ivory, oxblood, fine rules, and magazine typography.

The preview links lead to the real discovery and collection screens. A full theme rollout should include all screens and both light/dark modes after a direction is chosen.

## Valuation example

`value-demo.js` calls the same `Portfolio.metrics` calculator as real collections. Its sliders use an explicitly illustrative 100 mL bottle with a $100 baseline. It does not write to storage, create account entries, or present its sample prices as live quotes.

## Featured shelves

Approved photos and complete bottle identities determine shelf eligibility. Fresh-price eligibility remains in `Pricing.value`; a missing or expired quote shows “Price being checked.” It no longer removes an otherwise valid fragrance from the home page. Six distinct fragrance identities are shown, with one size per identity on this curated shelf. Discover retains the full bottle variants.

Run `node --test ./*.test.js` for the automated domain/account checks, including stale-price discovery and the example's accounting identity.
