# Free catalog and photo automation

GitHub Actions runs `Catalog and photo automation` every day at 08:17 UTC (4:17 AM Puerto Rico). Scheduled jobs can be delayed. You can also use Actions → Catalog and photo automation → Run workflow.

The job imports the current Open Beauty Facts export, preserves existing records missing from that export and previously reviewed product identities, and screens up to ten image candidates per run. Resolution, file format, size, focus diagnostics and background diagnostics are checked without a paid service. Diagnostics flag issues; they do not establish visual quality or identity.

## No paid AI integration

The OpenAI client and secret reference have been removed. No API key, API billing account or credit purchase is needed. Even if an OpenAI key is present in the environment, this script cannot use it. It never approves or publishes images automatically.

## Manual visual approval

Technically acceptable photos remain `pending_visual_review`. Inspect each original against `assets/fragrances/afnan-9pm-night-out.png`. Confirm a clear label, complete bottle/cap, natural proportions, clean background, no watermark, and the exact fragrance, concentration and bottle size. Matching packaging beside the bottle is allowed. Reject poor photos and hold uncertain identities. Existing approved images remain available.

Use the existing assess/review/publish process in [photo-review-workflow.md](photo-review-workflow.md) to record the reviewer, exact identity, all five checks, source, license and notes before publishing. Photos are never generated, retouched or enlarged. Original files are copied with attribution only after explicit approval.

Only Open Beauty Facts image candidates are downloaded under their existing licensing. Seller sites are not scraped; live market prices and affiliate feeds are not connected by this job. `data/photo-review-log.json` records the technical screening results and source hashes. Rejected unchanged sources are skipped.

The catalog job commits its results and dispatches `Publish fragrance library` so changes reach GitHub Pages automatically. Catalog runs are serialized. Deployments include only frontend files, assets and public catalog data.

Hosting uses the public GitHub Pages repository and collections use the existing Supabase Free project. Stay within the providers' free-plan limits; no paid upgrades or custom domain purchases are required for the present setup.
