# Activate Google sign-in

The app's Google sign-in button, OAuth redirect handling, account session loading and private collection storage are implemented. Supabase is connected, and private collection access tests passed. **Google cannot authenticate visitors until a Google OAuth web client is created and configured in Supabase.** No custom domain or email sender is needed for this flow.

## One-time owner setup

1. Open https://console.cloud.google.com/auth/overview and select or create a project named **Fragrance Library**.
2. Configure Google Auth Platform's branding and audience. Use your own support/developer email. Select External audience for public users. Only request `openid`, `userinfo.email` and `userinfo.profile`. While the application is in Testing, add your own Google account to its test users; publish the audience when ready for other users.
3. Create a **Web application** OAuth client with these exact values:

| Setting | Value |
| --- | --- |
| Authorized JavaScript origin | `https://pologram1.github.io` |
| Authorized redirect URI | `https://kgxhbjmalvawuawbkbhg.supabase.co/auth/v1/callback` |

4. Open https://supabase.com/dashboard/project/kgxhbjmalvawuawbkbhg/auth/providers and select **Google**. Enable it, enter the Google Client ID and Client Secret **in that dashboard**, and save. Never paste the secret into GitHub, client code or chat.
5. Reload the app and open Sign in. It reads Supabase's public provider settings and enables **Continue with Google** when Google is configured and OAuth registration is allowed. No additional website configuration flag is needed.
6. Verify sign-in with a real Google account, add a fragrance, reload to check persistence, and sign in on another device. Verify a second account sees its own collection. Guest collections are imported only with the separate import action.

## Backend state

Supabase permits new OAuth accounts and has Email authentication disabled. Email/password UI remains hidden until a verified sender and email registration are intentionally enabled. Google is currently disabled pending the owner's client credentials. Do not enable it with placeholder credentials.

## Access and data

The application asks Google only for identity/profile access. It does not ask for Gmail, Drive or Contacts access. Supabase issues the session used by the existing private collection access rules. Google handles sign-in; the app does not store Google passwords.

Official setup reference: https://supabase.com/docs/guides/auth/social-login/auth-google

Run `node google-signin.test.js` for readiness and redirect tests. OAuth approval and real Google-account sign-in remain unverified until the provider is configured. Mock tests do not prove a successful external OAuth login.
