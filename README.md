# Fragrance Library

A Polo Studios project by Miguel A. De Jesus.

## Goal
Organize a personal fragrance collection and estimate its current replacement value using matching, in-stock offers from approved fragrance retailers.

## Initial scope
- Add fragrances to a collection by exact fragrance, concentration, and bottle size.
- Record purchase price optionally.
- Display individual market prices and total collection replacement value.
- Show seller links, availability, currency, and last-checked timestamps.
- Compare representative market price, lowest verified offer, and official retail price where available.

## Pricing policy
- Start with FragranceNet, Beauty House, Jomashop, and FragFlex as candidate sources; verify exact domains and suitability before integration.
- Additional sellers require documented reputation, authenticity, returns, and pricing-transparency review.
- Use the median of eligible matching in-stock offers as the representative price.
- Use official retail when reliable discount offers are unavailable.
- Exclude mismatched sizes/concentrations, unavailable products, unselected testers, memberships, and personal coupons.
- Identify taxes and shipping separately.
- This measures replacement cost, not used-bottle resale value.
- No fabricated live prices: label mock data and stale/unverified offers explicitly.

## Data access
Review each seller's permitted integration methods. Prefer approved APIs or feeds; source access, update schedules, currency, and regional shipping eligibility remain to be determined.

## Status
Planning. Product name and implementation stack are not finalized. No live price integrations yet.
