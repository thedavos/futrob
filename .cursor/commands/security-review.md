# Review Futrob security

1. Trace identity from Better Auth in `apps/auth` through `ActorId`, web BFF/native session handling, API service authentication, effective permission decisions and organization-scoped product access in Postgres. D1 owns auth/actors and BFF rate limits; product tenancy does not rely on Postgres RLS.
2. Test cross-organization reads, writes, job claims, and public projections with predictable IDs.
3. Verify browser code has no server secrets, Wrangler secrets, or direct private table access.
4. Review EA sync job auth, idempotency and rate limits. Verify EA egress stays in the API game-data adapter and service/provider credentials never reach browser or native clients.
5. Trace actual raw EA observation storage and access paths in the current adapters; public projections and telemetry must not leak private payloads or tokens.
6. In isolated tests, replay implemented sync jobs, confirmations and officialization operations to verify idempotency. Inspect outbox/notification delivery before testing it; the current no-op domain publisher is not evidence of durable delivery.
7. Pass representative payloads through logs and Sentry redaction; assert secrets and raw provider bodies are absent.
8. Report findings by severity with reproducible evidence and affected acceptance criteria.
