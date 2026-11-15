# Activity feed

Operators read organization activity, and players read their directed invitations and the activity of teams they represent. Home shows up to ten rows with a full-feed link. The full feed pages 25 rows at a time. Pending includes only open, actionable, unexpired rows for the selected space.

## Sub-features

- `feed-organization` covers organization home, `/orgs/$orgId/activity`, pagination, and operator permission denial.
- `feed-player` covers `/player`, its activity CTA, `/player/activity`, and the empty personal feed. Captain and vice-captain rows are scoped to the competition where they represent a team.
- `feed-pending` covers the account's **Con pendientes** sidebar layout in organization, competition, and personal spaces. Closed and expired rows stay out of Pending.
- `feed-actions` covers publication, selection confirmation, disputes, directed roster invitations, reschedule negotiation and expiry, registration decisions, audience isolation, and command replay.

## How to get to it (user POV)

- Organization home → **Actividad reciente** → **Ver toda la actividad** → full activity → row destination. Use the workspace selector to return to the organization or personal home.
- Personal **Inicio** → **Actividad reciente** → **Ver toda la actividad** → `/player/activity` → row destination.
- Account menu → **Configuración** → **Barra lateral** → **Con pendientes** → **Guardar cambios** → **Cerrar**. Pending follows the current workspace. Select **Navegación** to restore navigation links.
- Direct URLs reach the same authenticated pages. The organization endpoint still requires `encounters.results.approve` at organization scope. An ordinary member or another organization's operator receives 403.

## Driving it with verify-futrob

Preconditions:

- Run doctor and require all three services plus `db: ok`. Use a database owned by this run. Never migrate, seed, or reset the configured shared database.
- Use the demo seed for accounts, rosters, rules, fixtures, and persisted EA observations. Its generated data is setup, not evidence of actions performed in this verification.
- Local Hyperdrive requires a password in the connection URL, even when disposable Postgres uses trust authentication. If web cannot find `futrob-auth`, align `CLOUDFLARE_DEV_REGISTRY_PATH` and `WRANGLER_REGISTRY_PATH` for the owned launch. Health probes alone do not prove the service binding works. Prove login through web.
- The retained FEED-01 driver requires the isolated database `127.0.0.1:55432/futrob_feed01` and an owned API at localhost:8787 using that same database. It rejects other database targets. Use a fresh seed for its mutating modes.

Run the existing CLI golden path and keep its command, output, and exit code. Read the resulting competition back with `comp-show`. CLI supports `comp-publish`, `comp-apply`, `entry-approve`, and `entry-reject`. It has no activity, selection, reschedule, or roster-invitation commands.

The SDK driver fills those command gaps. From the repository root:

```bash
FEED_EVIDENCE_DIR=.agents/skills/verify-futrob/evidence/<run-id> \
  apps/api/node_modules/.bin/tsx --tsconfig apps/api/tsconfig.json \
  .agents/skills/verify-futrob/helpers/feed-01-live.mjs <mode>
```

Modes are `inspect`, `selections`, `invitations`, `reschedules`, `expiry`, `registrations`, `applications`, `access`, `readback`, and `preferences`. `applications` issues real CLI applications, then reads decisions through the SDK. `preferences` selects the Pending sidebar through the public SDK for browser setup. `access` verifies EffectiveAccess and organization denial for the seeded roles. `readback` verifies publication and rejected-application state, including repeated decisions. The mutating modes expect their named demo encounters to be available. A fresh seed restores those prerequisites.

- Propose a selection. Verify one actionable rival row, no actionable proposer row, and an organization watch row. Replay the key. Confirm and replay confirmation. Read the closed row and absence from Pending.
- Open a dispute, replay, review, and resolve it. Verify one operator Pending row while open, then its closed history row.
- Create a directed roster invitation using a registered game identifier. Verify the invitee's row, another actor's exclusion, and the organization's watch row. Decline and read the closed row.
- Create and replay a reschedule. Counter and replay the counter. Verify the first proposal closes and the other team gets the new action. Accept, replay, and read the applied schedule and closed rows.
- Expiry requires at least one hour. The `expiry` mode serves the real API factory and production HTTP routes over local HTTP and Postgres with an injected `ClockPort`. It advances that clock past the response deadline, invokes `/internal/scheduling/reschedule-expiry/run`, then resolves the escalation. Record this as controlled-clock HTTP integration evidence. It does not prove elapsed wall-clock execution or the deployed scheduler.
- Apply through CLI as two players. Verify operator Pending rows. Approve one and reject the other. Read each applicant's current application and closed team decision. Replay the decision and verify no extra rows.
- In the browser, assert ten recent rows, the CTA, 25 rows on the first full page, and **Cargar más** when a cursor exists. Capture personal and organization views. Switch sidebar layout and capture Pending in both spaces. Exercise an empty account and an ordinary member's denied organization deep link.
- Save screenshots, ARIA snapshots, CLI output, and SDK readbacks under the run's evidence directory. Record the feature IDs and entry points in `NOTES.md`. Keep unit and Storybook results distinct from live proof.

## Gotchas

- A token-only invitation has no activity audience in this delivery. Directed invitation lookup uses a game identifier, not an email or actor ID. Token invitations and email remain MAIL-01 work.
- Mobile reads remain MOB-06. Responsive web screenshots do not prove native clients.
- Type and status filter controls remain deferred. Existing HTTP status/action filters support Pending without filter controls on the full screen.
- The account defaults to the navigation sidebar. An absent Pending section can mean its layout has not been selected.
- A rejected registration decision must lead somewhere the applicant can still read. Check the row destination as well as its title and status.
- The expiry runner needs a provisioned `SCHEDULING_SYSTEM_ACTOR_ID`. A clock advanced in one API instance does not advance the default-clock API or browser.
- Browser and SDK evidence can contain tokens if entire invitation responses or auth payloads are logged. Retain invitation metadata and row state only. Do not commit env files, cookies, bearer tokens, seed invitation links, or auth storage state.
