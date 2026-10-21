# Collection value and consumption

Enter **Remaining per bottle (mL)** when adding or editing an owned fragrance. Blank means full. Zero means empty. Quantity multiplies that same fill level; separate entries are needed when bottles have different fill levels. Existing collections default to full bottles until updated. Backups and private cloud saves include remaining mL and price history.

The overview separates:

- **Remaining collection value:** current eligible full-bottle market price × remaining mL ÷ bottle size × quantity.
- **Gain/loss versus purchase cost:** remaining value minus the original recorded purchase cost, compared only for bottles having both purchase cost and a current eligible price.
- **Market price movement:** current price minus first tracked market price, multiplied by the fraction still owned and quantity.
- **Value consumed:** liquid used, valued at the first tracked market price.
- **Net change since tracking:** market movement minus value consumed.

Example: a 100 mL bottle had a first tracked market price of $100, now costs $120 and has 50 mL left. Remaining value is $60, market movement on the remainder is +$10, consumed value is $50, and net change since tracking is −$40. If the original purchase cost was $80, the gain/loss versus purchase cost is −$20.

These values are proportional estimates of remaining fragrance, not actual used-bottle resale quotes, cash earnings, or realized investment returns. Full-bottle retail/replacement prices and used-bottle resale prices are different markets. Discontinuation does not apply an invented premium; changing seller offers drives changing prices.

Price sources include the shared reference database and optional personal seller offers. Eligible reviewed, matching, in-stock USD offers checked within seven days are aggregated using the existing discount median / official retail fallback. Missing or stale prices are excluded and totals state their coverage. Historical first prices remain after newer offers expire. Price history records observed changes after tracking starts and is capped at 366 points; variant changes clear history and incompatible offers.

No paid API is required. The public seller-price database is refreshed daily by GitHub Actions; it is a checked snapshot rather than a per-request live quote.
