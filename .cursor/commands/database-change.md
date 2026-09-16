# Create a Futrob database change

1. Determine ownership: product tables use Postgres in `apps/api/migrations`; auth/actors and BFF rate limits share the D1 history in `apps/auth/migrations` (ADR-0015).
2. Inspect the existing ordered SQL migrations and adapters before adding the next migration.
3. For D1, check the installed Wrangler migration commands with `--help`; use `--persist-to ../web/.wrangler/state` from `apps/auth` for the shared local database.
4. Use expand/migrate/contract for incompatible changes. Review Better Auth generated SQL before adding it to the shared D1 history.
5. Tenant-owned product data must support organization scoping in adapters; personal actor data uses its own ownership boundary.
6. Add adapter mapping and isolation tests for the changed boundary.
7. Apply to a clean local/test database and verify upgrades from the previous schema. The Postgres integration suite uses `TEST_DATABASE_URL` and isolated test schemas.
8. Run relevant tests and `npm run check`. Report which database validations actually ran.
