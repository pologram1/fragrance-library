# Daily catalog and photo automation

GitHub Actions runs `Catalog and photo automation` every day at 08:17 UTC (4:17 AM Puerto Rico). GitHub can delay scheduled jobs. You can also use Actions → Catalog and photo automation → Run workflow.

The job imports the current Open Beauty Facts export, preserves existing records missing from that export, and preserves previously reviewed product identities. It screens up to ten image candidates per run and, when configured, sends at most ten image-review requests to OpenAI. This is a request cap, not a monetary spending cap. Model: `gpt-6-luna`.

## Enable the AI reviewer

Create an OpenAI API project key with access to the Responses API and an active API billing account. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**. Name it **OPENAI_API_KEY** and paste the key as its value. Never put it in website code or chat. Then run the catalog workflow once to verify API access. The workflow summary distinguishes enabled, missing-key and API-unavailable states.

Without the secret, catalog imports and technical screening still run. Photos remain pending visual review. Existing approved photos remain visible.

## Publication rules

Automatic publication requires native dimensions and file checks, all five visual checks, no watermark, a complete bottle/cap, and visible evidence of the exact brand, fragrance, concentration and bottle size. Missing size or concentration evidence is held. An estimated confidence below 0.98 is held. AI estimates can be wrong: review published results regularly. Images are not generated, retouched or enlarged. The reference is supplied only to compare style and clarity.

Only approved Open Beauty Facts source images are imported under their existing CC BY-SA attribution. Seller sites are not scraped by this workflow. Pricing and affiliate feeds remain separate future integrations.

`data/photo-review-log.json` records source URLs, hashes, diagnostics and AI notes. Held/rejected unchanged source URLs are skipped; reviewed matching hashes are not sent again. To request a fresh review after correcting metadata or finding another source, remove that candidate's audit row through a reviewed change. Already approved images require the manual replacement workflow.

The website deploys through `Publish fragrance library`. The catalog job dispatches this deployment explicitly because commits made with GitHub's built-in Actions token do not start another push workflow. Concurrent catalog runs are serialized. Published site artifacts include only front-end files, assets and public catalog data; API keys stay in Actions secrets.
