# Long-Term Plan

## Phase 1: Railway Readiness

- Keep the Traccar VPS unchanged.
- Deploy RAFACAR-DEV2 as a Railway web service.
- Use `railway.toml` as the deployment source of truth.
- Validate every push with GitHub Actions before trusting autodeploys.

## Phase 2: Session Reliability

Current sessions are stored in process memory. This means users can be logged out after restarts, deploys, or scaling events.

Recommended improvement:

- Add Railway Redis.
- Store `rafacar_sid` sessions in Redis.
- Keep cookie settings as HttpOnly and SameSite=Lax.
- Set session TTL from `SESSION_TTL_MS`.

## Phase 3: Environments

Create two Railway environments:

- `staging` for tests.
- `production` for client use.

Use the same variables in both environments, changing only values that truly differ.

## Phase 4: Real-Time Tracking

The current application can poll Traccar. For smoother tracking:

- Add support for Traccar `/api/socket`.
- Keep REST polling as a fallback.
- Reconnect automatically after network drops.

## Phase 5: Security and Observability

- Restrict allowed origins once the final Railway/custom domain is known.
- Add structured logs for login failures and proxy errors.
- Add uptime monitoring for `/api/health`.
- Add deploy notifications.
- Review rate limits after real usage data exists.
