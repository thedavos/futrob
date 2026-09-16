# Implement a Futrob feature

1. Map requirement/acceptance IDs in `product/`.
2. Identify owning module in `packages/<bc>` (scheduling vs game-data vs results vs statistics vs analytics).
3. Implement domain/application in the package → product adapters/HTTP in apps/api → SDK/BFF → presentation.
4. Wire adapters only in `apps/api/src/di/*`.
5. Enforce session, Futrob permission, organization-scoped product persistence, idempotency, audit, and redaction where relevant.
6. Emit versioned events for cross-module effects; never write another module's tables.
7. Add the smallest useful tests at each changed boundary.
8. Run typecheck/tests/check when scripts exist; report deferred work.
