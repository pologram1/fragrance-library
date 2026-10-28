# Home page polish and design studies

The production cover uses the selected Old San Juan artwork with City Rhythm Puerto Rico and Anarchy 100X35 as larger bottles, and Maiora Isla del Caribe as the smaller center bottle. The optimized WebP is preloaded and independent of market-price availability. On smaller screens, controls move below the complete artwork to preserve the title and bottle group. The three alternatives at `templates.html` are responsive design studies; selecting one changes only the preview, never an account preference or collection.

- **Atelier Noir:** charcoal, warm ivory, restrained brass, and a gallery arch.
- **Deco Vert:** forest green, champagne, stepped geometry, and an architectural frame.
- **Maison Editorial:** paper ivory, oxblood, fine rules, and magazine typography.

The preview links lead to the real discovery and collection screens. A full theme rollout should include all screens and both light/dark modes after a direction is chosen.

## Valuation example

`value-demo.js` calls the same `Portfolio.metrics` calculator as real collections. Its sliders use an explicitly illustrative 100 mL bottle with a $100 baseline. It does not write to storage, create account entries, or present its sample prices as live quotes.

## Featured shelves

Approved photos and complete bottle identities determine shelf eligibility. Fresh-price eligibility remains in `Pricing.value`; a missing or expired quote shows “Price being checked.” It no longer removes an otherwise valid fragrance from the home page. Six distinct fragrance identities are shown, with one size per identity on this curated shelf. Discover retains the full bottle variants.

Run `node --test ./*.test.js` for the automated domain/account checks, including stale-price discovery and the example's accounting identity.

## Warm theme and fragrance spotlight

`spotlight.css` extends the cover palette throughout the app: limestone and burgundy in light mode, terracotta and amber in dark mode. The existing theme preference remains in use.

The home spotlight appears immediately below the cover. `fragrance-spotlight.js` uses the existing reviewed-photo selection and exact-bottle price eligibility. It supports previous/next buttons, direct selection, Left/Right and Home/End keys, and horizontal touch gestures. It never advances automatically or changes a collection. Hidden slides are inert and excluded from navigation; price gaps remain explicit. Selection survives normal rerenders by stable fragrance ID.
