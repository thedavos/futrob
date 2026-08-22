---
name: futrob-cli
description: Use the Futrob CLI (apps/cli) to exercise domain use cases and smoke-test the apps/api HTTP surface from the terminal. Use when verifying a use case end-to-end, debugging an API endpoint without opening the browser, running the offline domain smokes or e2e-golden-path, or adding CLI commands.
---

# Futrob CLI

## When to use

You need terminal-level evidence that domain logic or an `apps/api` endpoint works. That means use cases against in-memory fakes, live `/api/v1` calls, or the full golden path (org → competition → entries → publish → fixture).

## Running

Commands run from the repo root through npm:

```bash
npm run cli -- <command> [args] [--json]
```

`npm run cli -- help` prints every command; `apps/cli/README.md` has the full table. This skill does not repeat them.

## Offline smokes

Four commands run without any server. Each prints JSON evidence and exits 0 or 1:

```bash
npm run cli -- domain-smoke              # shared-kernel + scheduling/results types
npm run cli -- domain-smoke-game-data    # game-data pure helpers + fake provider use case
npm run cli -- statistics-smoke          # personal stats use case with in-memory repos
npm run cli -- results-smoke             # select → confirm official result, asserts emitted events
```

Run these first when touching `packages/*` domain code. They fail fast without Postgres or Workers.

## Integration commands

Everything else talks to live `apps/api` through `@futrob/sdk`. Start the API first (`npm run api`, port 8787), then set up service auth.

Every secured endpoint demands `Authorization: Bearer INTERNAL_JOB_SECRET` plus `X-Futrob-Actor-Id`. The CLI builds both from:

| Source | Role |
| --- | --- |
| `FUTROB_INTERNAL_JOB_SECRET` | Bearer token. Must equal `apps/api/.env`'s `INTERNAL_JOB_SECRET`, or every call returns 401 |
| `--actor <id>` flag or `FUTROB_ACTOR_ID` | Actor identity driving RBAC decisions |

```bash
export FUTROB_INTERNAL_JOB_SECRET="$(grep '^INTERNAL_JOB_SECRET=' apps/api/.env | cut -d= -f2)"
npm run cli -- org-create "Mi Org" --actor actor_demo
```

A 401 `api.unauthorized` means the secret does not match the running API's `.env`.

## e2e-golden-path

After cross-module changes, run the golden path before individual commands. It reports the exact step where the chain breaks:

```bash
npm run cli -- e2e-golden-path --actor actor_demo
# ping → org → draft → team ×2 → entry ×2 → approve ×2 → publish → fixture
```

Then drill into single commands using the IDs from its output, for example `comp-list` or `fixture-show <orgId> <compId> <planId>`. Add `--json` anywhere for raw response bodies.

## Expected failures

These responses come from domain rules and RBAC, not from CLI defects:

- `snapshot-set` returns 409 `fixture_managed_conflict` on encounters owned by a generated fixture plan. Manual snapshots only apply to manually scheduled encounters.
- `provider-health` returns 403 for actors without the `superusersManage` permission.
- A sync job that reaches `status=dead` after `sync-job-run` means EA egress failed, for example a nonexistent club id. Check the DLQ path.

## Adding a command

Follow `apps/cli/README.md` ("Añadir un comando..."). The rules:

- Return `Effect.Effect<number, CliError>`. Errors travel through the Effect channel; commands do not throw across boundaries.
- Build requests through `apiCall(config, (client) => ...)` from `@futrob/sdk`. No ad-hoc fetch, no web adapters.
- Parse enums at the boundary with the Zod schemas from `@futrob/api-contracts`. The anti-slop lint rejects unjustified type assertions.
- Register in `src/main.ts`. Document in `help.ts` and in the README table.
- Verify with `npm run typecheck -w @futrob/cli`, then run the new command once for real if it is an integration command.
