# Audit review fixes

Verified on 2026-11-11 for PR #268, after rebasing its three commits onto the
sanctions correction in `1e8693d2`. No PR was merged.

The global query authorizes competition scopes in one batch and excludes denied
competition entries before every source's page limit. Explicit denied queries
return 403. HTTP and PostgreSQL regressions traverse pages of one entry with denied
rows ahead of permitted and organization entries.

Both results projections redact legacy email and phone values with the public
results policy. Regression GETs preserve the explanation and confirm stored actions
remain unchanged. Other contexts keep their existing reason policies.

Club connection auditing serializes each Team's prior-state read, mutation and
append. Memory and PostgreSQL regressions reproduce two facts before the fix and
one afterward. The PostgreSQL barrier holds the first snapshot until the second
reader arrives or waits for its advisory lock. The existing distinct-relink and
rollback regressions also pass.

The overview stories now use a separate QueryClient per mounted decorator, with
queries disabled as in existing isolated stories. All 15 overview stories pass,
including their interactions. The Storybook build passes.

| Story                | Before                                                                                      | After                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Competition overview | [Missing QueryClient error](/docs/evidence/audit-01/review-fixes/before-overview-story.png) | [Rendered overview](/docs/evidence/audit-01/review-fixes/after-overview-story.png) |

These captures prove Storybook rendering. No product styling or application UI was
changed, and the live authenticated browser flow was not repeated in this review
fix. Existing live UI evidence is recorded in the parent evidence directory.

The live API CLI golden path, organization and competition `audit-smoke`, and
`audit-list` pass with exit 0 on an isolated in-memory API process. PostgreSQL
integration tests use a separate local review database and throwaway schemas.
No shared or remote database was migrated or seeded. Legacy-row redaction and the
concurrent-write barrier are integration-test evidence, not CLI scenarios.

Commands, red/green outputs and exit codes are retained locally under
`/tmp/futrob-pr-review-fixes/`. The full API suite passes 156 files and 1,963 tests against the review database.
One existing skipped test remains unverified; no new skips were added. Organizations
passes 120 tests, results passes 145, and the affected web tests pass 24.
The final checks include `npm run check`, all-workspace
typechecks, the affected organizations/results/web suites, API route coverage,
PostgreSQL audit tests, overview stories and the Storybook build. The SANC contract
and OpenAPI checks ran before the rebase; AUDIT changes no HTTP schema.

Clients share the corrected API through the existing SDK. Mobile adds no UI in this
fix. Organization and competition audit routes, both club-link HTTP routes and the
CLI continue to use their existing entry points. Read-only pagination and return
navigation keep their existing reverse paths. Loading, empty, filtered-empty,
error and denied presentation states retain their stories; backend denied access
has new regressions. ADR-0029 records the corrected authorization, redaction and
concurrency guarantees.
