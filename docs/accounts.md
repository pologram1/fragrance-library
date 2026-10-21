# Free username accounts

The application now offers **Sign up** and **Sign in** with a username and password. The existing Supabase Free project stores private collections; GitHub Pages hosts the front end. No paid API or email delivery service is required.

Usernames are 3–24 characters, begin with a letter, and contain letters, numbers or underscores. They are normalized to lowercase and mapped to an internal Supabase identifier at `accounts.fragrance-library.invalid`. This is an internal identifier, not a real or verified email address. The UI displays the username derived from that identifier. Passwords require at least 12 characters and a matching confirmation during registration.

Supabase email/password authentication is enabled with automatic confirmation for these internal username identifiers. Registration returns a session immediately. OAuth providers remain disabled. The application does not request actual email addresses, send confirmation messages, or offer password-reset email. Users must retain their passwords securely and export collection backups. Email recovery can be added later with a configured mail provider and an appropriate identity-verification flow.

## Privacy and synchronization

The browser contains only the project URL and publishable key; no service-role key or secrets. Supabase manages passwords and sessions. Row Level Security permits each authenticated user to read only their own collection. Direct browser writes are denied. The existing `save_my_collection` function binds every write to `auth.uid()`, validates payload bounds, and uses expected-version checks to stop concurrent changes from overwriting each other.

Signing in loads the private cloud collection. When creating an account, a visible checkbox lets the user bring their device collection into the new account. Existing-account sign-in shows a main-page **Add to my account** action for device-only items; it merges by ID after confirmation, preserving account items. The account dialog also retains **Import guest collection**. Signing out returns to the guest collection. Cloud collection contents are not written into the guest localStorage key. Failed saves remain in memory with a visible status and export option.

## Validation

`node username-auth.test.js` checks username normalization, identifier mapping, invalid inputs and password confirmation. `node cloud-store.test.js` checks owner binding, ordered saves, account changes, retry and version conflicts. Live API tests verified registration with a session, password sign-in, collection save/reload, second-user read isolation and cross-owner write rejection. Temporary test accounts were removed afterward.

The application remains subject to Supabase Free and GitHub Pages limits. No plan upgrade was made.

## Account flow improvements — 2026-10-21

Sign-in now waits for account collection loading before closing the dialog. Concurrent auth events share one pending read, avoiding duplicate collection loads. A failed collection load keeps editing blocked and exposes the retry path. The main-page device collection prompt explains where guest bottles are saved, and the sign-up checkbox makes copying them explicit. A show/hide password control improves entry on mobile.

`node --test auth.test.js` checks overlapping sign-in events, load completion, failed-load retry, guest merge without replacing account items, and the opt-in/out paths for sign-up. Live API checks using disposable accounts confirmed username registration, password sign-in, saved collection reload (including remaining mL), and isolation from a second account. Both temporary test accounts and their test collection were removed. No account security settings or permissions were weakened.
