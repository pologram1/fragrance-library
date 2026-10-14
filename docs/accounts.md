# User accounts and private collections

## Activation status

The interface, Supabase integration, private collection schema and tests are prepared. **Accounts remain unavailable until an authorized Supabase project is connected, the schema is applied, public client configuration is filled, and email delivery is configured.** Empty configuration keeps guest collections working and disables credential submission. No fake accounts or browser-stored passwords are created.

## Architecture

GitHub Pages hosts the existing static application. Supabase Auth manages email/password sign-up, confirmation, sign-in, session refresh, password reset and sign-out. Supabase Postgres stores one private JSON collection per authenticated user. The public catalog database is separate.

The application uses only a browser-safe `sb_publishable_…` key. The project secret, service-role key, database password and SMTP credentials must never go into this repository or client code. The Supabase SDK is loaded from a version-pinned ESM endpoint (`@supabase/supabase-js@2.117.3`).

Row Level Security allows users to read only their own collection. Browser clients cannot insert, update or delete rows directly. A narrowly scoped `save_my_collection` function verifies the authenticated owner, checks payload bounds and writes using an expected version. If another device changed the collection, saving stops and the UI asks the user to export their edits and reload, instead of silently overwriting data.

## Setup

1. Connect or create a Supabase project in the user's organization. Prefer a free project if available; do not upgrade a plan automatically.
2. Execute `backend/schema.sql` using the Supabase SQL Editor or an authorized Management API.
3. Run `backend/security.test.sql`. It verifies owner reads, isolation from another user, rejection of cross-owner writes, direct-write denial and stale-version rejection, with all test rows rolled back.
4. Enable Email authentication with **Confirm email** on. Configure a minimum 12-character password policy. Retain rate limits.
5. Set Site URL and the allowed redirect URL to `https://pologram1.github.io/fragrance-library/`. If using `index.html` directly, also allow `https://pologram1.github.io/fragrance-library/index.html`. Add custom-domain URLs only when actually used.
6. Configure a custom SMTP sender for public users. Supabase's default mail service only delivers to authorized project-team addresses and is not suitable for general public registration. Configure sender-domain verification with the selected email provider; keep its credentials in Supabase.
7. Fill `config.js` with the project URL and **publishable** key, then publish through the existing GitHub Pages workflow. No project secrets belong in this file.
8. Verify a real signup confirmation, sign-in, password-reset email, collection save, reload, another-device access, a second-user isolation check and sign-out.

Official documentation:

- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys

## Data handling

Guest mode continues using the existing `polo-fragrance-library-v1` localStorage key. Signing in loads the account collection and does not silently claim a previous person's guest records. A separate **Import guest collection** action copies guest items after explicit confirmation and keeps existing account records. Signing out clears account items from memory and returns to the local guest collection. Signed-in collection contents are not cached in the shared guest key.

Cloud saves are serialized. Errors keep edits in memory and display an unsynced status; export remains available. Navigation/closing warns while a save is pending. Sign-out is blocked until changes have synced or the user reloads the cloud collection after choosing to discard edits. Cloud snapshots have a 1,000-item and 5 MB limit. Prices remain manual at this stage.

## Verification

Run `node cloud-store.test.js`, `node catalog.test.js` and `node pricing.test.js`. Live Auth/email and SQL security tests require the connected backend; mock tests cannot establish that the deployed backend is correctly configured. Browser visual QA is still outstanding.
