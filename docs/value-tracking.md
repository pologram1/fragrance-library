# Collection value and consumption

Enter **Remaining per bottle (mL)** when adding or editing an owned fragrance. Blank means full. Zero means empty. Quantity multiplies that same fill level; separate entries are needed when bottles have different fill levels. Existing collections default to full bottles until updated. Automatic private account saves include remaining mL and price history.

The overview separates:

- **Remaining collection value:** current eligible full-bottle market price × remaining mL ÷ bottle size × quantity.
- **Market price movement:** current price minus first tracked market price, multiplied by the fraction still owned and quantity.
- **Value consumed:** liquid used, valued at the first tracked market price.
- **Net change since tracking:** market movement minus value consumed.

Example: a 100 mL bottle had a first tracked market price of $100, now costs $120 and has 50 mL left. Remaining value is $60, market movement on the remainder is +$10, consumed value is $50, and net change since tracking is −$40.

These values are proportional estimates of remaining fragrance, not actual used-bottle resale quotes, cash earnings, or realized investment returns. Full-bottle retail/replacement prices and used-bottle resale prices are different markets. Discontinuation does not apply an invented premium; changing seller offers drives changing prices.

The overview and collection show coverage for each statistic and an expandable bottle-by-bottle breakdown. Known usage remains counted when a bottle's current offer expires. Market and net changes include only bottles with both a starting price and a current eligible price, so their coverage can differ from usage coverage. Net percentage uses the first tracked full-bottle value of that same comparable subset. Unpriced values are labeled rather than treated as zero.

Fragrance detail pages include price range, per-mL average, included seller count, observation dates, other bottle sizes, and a personal bottle section with remaining-mL updates. Seller comparisons and the average use the same latest observation per seller. A newer out-of-stock check supersedes an older in-stock offer.

Price sources come from the shared reference database. Legacy personal offers remain compatible, but purchase-cost and manual price-entry controls are no longer exposed. Eligible reviewed, matching, in-stock USD offers checked within seven days are aggregated using the arithmetic average across eligible discount and official-retail sellers, counting each seller once. Missing or stale prices are excluded and totals state their coverage. Historical first prices remain after newer offers expire. Price history records observed changes after tracking starts and is capped at 366 points; variant changes clear history and incompatible offers.

No paid API is required. The public seller-price database is refreshed daily by GitHub Actions; it is a checked snapshot rather than a per-request live quote.
