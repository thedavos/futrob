# AUDIT-01 verification

AUDIT-01 is stacked on SANC-01, PR #263, because its unified read includes sanction history.
The new permission is `organizations.audit.read`. Existing authorization, plan, withdrawal,
sanction, fixture-edit and official-selection histories remain with their owners. ADR-0029
records the source inventory, new forward records and the limits of historical reconstruction.

## Behavior and proof

- The API returns organization-scoped, filtered pages with stable timestamp and ID cursors.
  Postgres tests cover tenant isolation and multiple entries in the same millisecond, including
  source timestamps with microsecond precision.
- HTTP tests cover organizer access, staff denied by default and granted only at a competition,
  captain/player refusal, superuser access, explicit deny and invalid resource chains. Cursors
  are bound to organization and filters. Audit mutation routes are absent.
- The two-match AC-E2E-001 integration test uses the real SDK, Hono and isolated Postgres.
  Only EA HTTP is replaced at its provider boundary. The timeline contains organization,
  competition, teams, entries, club connections, rosters, publication, fixture, durable sync,
  proposal, confirmation and approval. Replaying fixture generation, sync and confirmation
  preserves the timeline without duplicates. This is not proof of live EA or the public portal.
- Fixture, club and roster commands record missing forward facts in the same Postgres
  transaction as their mutation. A failing-before regression demonstrated a committed club
  association after audit failure; the adapter now uses the transaction executor and rollback
  passes. Distinct club changes sharing a correlation remain distinct; an unchanged replay
  creates no new audit record.
- Database tests reject audit edits and deletes and preserve tenant cascade cleanup. A separate
  migration check applies the previous 67 migration files, inserts an organization, applies
  0067, preserves the organization and verifies a no-op repeat. Clean schemas are migrated by
  the adapter and journey suites. No shared or remote database was migrated or seeded.
- Presentation checks cover translated actions, full UTC date filters, reversed ranges,
  pagination reset, cached refresh errors, retry and hiding cached history after 403. Browser
  stories distinguish ready, empty, filtered-empty, loading, denied and error states in ES/EN
  and at 360px. An organization creation itself produces history, so unfiltered-empty is a
  simulated story state rather than a live organization fixture.

## Live verification

The real organizer path passed from organization settings and the competition summary tab.
Action/actor filters, filtered-empty, clear filters, reversed date validation, next/previous
pages, affected-object navigation and the 360 px layout passed. API readbacks matched the
organization and competition scopes and confirmed disjoint pages.

A separate captain pass verified both direct pages display denial and both BFF reads return 403. POST, PATCH and DELETE return 405, with identical GET history before and after. Live CLI
runs passed the golden path, both audit-smoke scopes and audit-list with exit 0.

Raw action logs, ARIA snapshots, screenshots and JSON readbacks are retained locally at
`.agents/skills/verify-futrob/evidence/20261110T221149Z-1123355/`, with the feature-by-feature
record in `NOTES.md`. Before/after images and representative ARIA snapshots are committed
beside this document. The combined browser run and a later captain attempt encountered
intermittent bootstrap/effective-access 503 responses. Those failed attempts remain in the
local evidence. The successful organizer and captain passes are reported separately.

| View                        | Before                                                    | After                                                                                                                  |
| --------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Organization settings entry | [Settings](/docs/evidence/audit-01/before-settings.png)   | [Organization audit](/docs/evidence/audit-01/after-settings.png)                                                       |
| Competition navigation      | [Summary](/docs/evidence/audit-01/before-competition.png) | [Summary tab](/docs/evidence/audit-01/after-competition-summary.png)                                                   |
| Competition viewer          | No viewer existed                                         | [Audit](/docs/evidence/audit-01/after-competition.png)                                                                 |
| Narrow viewport             | No viewer existed                                         | [360 px](/docs/evidence/audit-01/after-mobile.png)                                                                     |
| States                      | No viewer existed                                         | [Filtered-empty](/docs/evidence/audit-01/after-filtered-empty.png), [denied](/docs/evidence/audit-01/after-denied.png) |

## Checks

The final source revision passed these checks. Full command outputs and exit codes are
retained in the local evidence directory listed above.

- `npm run check` and `npm run typecheck` passed across all workspaces.
- The affected API, organizations, contracts, SDK, CLI, teams, scheduling, results,
  billing, notifications, competitions, statistics and shared-kernel suite passed
  277 files and 2,970 tests. One existing memory-fixture rollback test is intentionally
  skipped because that assertion requires Postgres; its Postgres variant ran. No new
  audit integration suite was skipped.
- Targeted web/navigation/access checks passed 11 files and 77 tests. The audit Storybook browser
  checks passed all 12 scenarios, separate from live application verification.
- `npm run openapi:check`, `npm run build`, `npm run bundle:budget` and
  `npm run storybook:build` passed. Offline `domain-smoke`, `results-smoke` and
  `statistics-smoke` exited 0.
- The clean-install and previous-schema migration upgrade checks passed against isolated
  local Postgres schemas. Historical organization data survived the upgrade and a second
  migration-runner invocation applied no files.
- Live golden-path, both audit-smoke scopes and audit-list commands exited 0. The
  organizer browser run and the separate successful captain run are listed above.
- The staged-file scan found no env files, known secret values or token/private-key patterns.
  The owned verification stack was stopped and ports 3000, 8787 and 8788 were free.

Security review found no blocking organization-isolation, authorization, cursor or mutation
issue. The new approval/rejection read passed failing-first and passing-after tests. The
separate club-association rollback regression failed before using the transaction executor
and passed after it. Browser failures due to local bootstrap 503s remain recorded as failures;
they are not treated as successful runs.

## Surface checklist

| Surface        | Applied or not applicable                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clients        | Web organization and competition viewers changed. Shared calls live in `@futrob/sdk` for web, CLI and native consumers. A native screen is outside this task's explicit web scope and remains unverified.                         |
| Contract       | Added `/api/v1` audit schemas, GET API/BFF routes, OpenAPI artifacts and SDK resource. Route coverage and read-only behavior are checked.                                                                                         |
| Access         | Added audit-read to EffectiveAccess catalogs and shell probes. Organizer, staff grants, captain, player, superuser, explicit deny, outsider and tenant isolation are checked.                                                     |
| Entry points   | Organization sidebar/settings link, competition sidebar/tab, direct routes, affected-object links, BFF, SDK and CLI are covered. No audit notification or native deep link is introduced.                                         |
| Reverse states | Read-only viewer adds no audit mutation. Summary navigation, previous/next pages and clear filters provide return paths. Sanction revocations and other owner decisions remain visible as separate history entries.               |
| States         | Ready, loading, error/retry, cached refresh error, permission denial, empty and filtered-empty are covered by presentation checks and stories. Live states are listed separately above.                                           |
| Docs           | ADR-0029/index, module boundaries, SDK and CLI README/help, and the verification feature map are updated. AGENTS.md and the dependency graph remain accurate because package dependencies and the design contract did not change. |

## Limits

Historical missing facts are not invented. Automated sync jobs have no actor and belong to
an organization; their rows are not attributed to a competition. Team-entry acceptance is
represented by its existing actor-bearing activity. The viewer links only to existing internal
destinations. It exposes neither raw EA payloads nor write operations.

The entry-decision review found a missing read of existing approval/rejection activities.
Failing-first HTTP, Postgres journey and UI-label checks captured the missing facts. The
unified read now includes one decision per source, with the original actor and timestamp.
A pre-existing Postgres rejection transition in
`apps/api/src/adapters/competitions/competition-entry.repositories.ts` keeps pending entries
pending. This task leaves that workflow unchanged. The canonical journey proves real
approvals. Projection of an existing rejection is covered with a scoped activity fixture;
this is not proof of the live Postgres rejection command.
