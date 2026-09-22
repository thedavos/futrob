# Run the Futrob release gate

1. Read `AGENTS.md`, the current architecture and release scope. Map requested Must/Should acceptance IDs and list deferred work; distinguish implemented flows from product targets.
2. From the repository root, install using the documented Vite+ workflow (or `npm ci` for a fresh checkout), then run `npm run check`, `npm run typecheck`, `npm run test -- --run` and `npm run build`. Inspect current package scripts for additional gates relevant to changed apps.
3. Verify clean-install and upgrade migrations on local/test databases: auth D1 uses `apps/auth/migrations` and shared local state; product Postgres uses `apps/api/migrations`. Run applicable isolation, contract, integration and E2E suites. Report unavailable database or browser prerequisites explicitly.
4. For UI changes, use [ui-review](ui-review.md), [design.md](../../design.md) and the [shared composition workflow](../skills/references/design-composition.md). Build Storybook and verify the affected stories, ES/EN and relevant states. Start with Inicio and the closest recent page; verify other release flows only when included in scope.
5. Check that secrets and unsanitized production EA payloads are not tracked and relevant telemetry redaction tests pass.
6. Check the configuration of affected deployables: web/auth on Workers, product API on Node/Railway, native app on Expo. Verify environment isolation and required bindings/secrets without exposing values. A build does not prove deployed health or durable event delivery.
7. Report pass/fail/blocked per gate, skipped checks, open risks, migration order and recovery steps. Running this gate does not itself deploy or publish a release.
