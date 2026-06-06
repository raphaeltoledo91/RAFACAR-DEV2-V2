# Railway Deploy Guide

This project is prepared to run on Railway as a single Node/Express web service that serves the built React frontend and proxies API calls to the existing Traccar server.

## Architecture

```text
Browser
  -> RAFACAR-DEV2 on Railway
  -> Express proxy in server.js
  -> Traccar API on Oracle VPS
```

The Oracle VPS continues to run Traccar. Do not install this frontend on the Traccar VPS.

## Railway Project Setup

1. Open https://railway.com/new.
2. Choose Deploy from GitHub repo.
3. Select `raphaeltoledo91/RAFACAR-DEV2`.
4. Use branch `main`.
5. Railway reads `railway.toml` automatically.

## Build and Runtime

The deployment is configured in `railway.toml`.

```text
Build command: npm ci && npm run build
Start command: npm start
Healthcheck: /api/health
```

The app uses Node 20 via `.nvmrc`.

## Required Variables

Create these variables in Railway under Service > Variables.

```env
TRACCAR_URL=https://gps2.rafacarrastreadores.com.br
POLLING_MS=30000
ALLOW_UNSAFE_GOOGLE_TILES=true
SESSION_TTL_MS=28800000
NODE_ENV=production
```

Do not commit Traccar user passwords, admin passwords, or API tokens to GitHub.

## First Test

After Railway deploys, open:

```text
https://YOUR-RAILWAY-DOMAIN/api/health
```

Expected response includes:

```json
{
  "ok": true,
  "service": "rafacar-dev2"
}
```

Then open the root domain and sign in with a valid Traccar user.

## Operational Notes

- This repository does not replace or modify the Traccar server.
- The frontend should access Traccar through the Railway proxy, not directly from the browser.
- Sessions are currently stored in memory. This is acceptable for initial testing, but Redis-backed sessions should be added before scaling or relying on long-lived sessions.
- Keep Railway autodeploy enabled only for `main` after the GitHub readiness workflow is passing.

## Long-Term Hardening

1. Add Redis-backed session storage.
2. Add Railway environment separation for `staging` and `production`.
3. Add stricter CORS and domain allowlists after the final domain is chosen.
4. Add deploy notifications.
5. Add uptime monitoring for `/api/health`.
