# Create a Futrob database change

Read [futrob-hexagonal-module](../../.agents/skills/futrob-hexagonal-module/SKILL.md) and the current architecture before changing persistence.

1. Determine ownership: there is one Postgres and one history, `apps/api/migrations` (ADR-0021). Product tables, `auth_*`, `actors`/`identity_subjects` and `app_rate_limit_windows` all live there; ownership decides who writes a table, not where its migration goes. Any column that stores an `ActorId` needs a foreign key to `actors (id)`.
2. Inspect the existing ordered SQL migrations and adapters before adding the next migration.
3. Apply with `npm run migrate -w @futrob/api` (each file in its own transaction, recorded in `schema_migrations`). A change to `auth_*` also updates `apps/auth/src/adapters/auth/drizzle-schema.ts`.
4. Use expand/migrate/contract for incompatible changes. Review Better Auth generated SQL before adding it to the history.
5. Tenant-owned product data must support organization scoping in adapters; personal actor data uses its own ownership boundary.
6. Add adapter mapping and isolation tests for the changed boundary.
7. Apply to a clean local/test database and verify upgrades from the previous schema. The Postgres integration suite uses `TEST_DATABASE_URL` and isolated test schemas; fixtures that store an actor call `seedActors` first (`apps/api/src/testing/seed-actors.ts`).
8. Run relevant tests and `npm run check`. Report which database validations actually ran.

Keep migration verification on local/test databases. Report clean-install and upgrade results separately; product tenant isolation is enforced by application/adapters, without relying on Postgres RLS.
