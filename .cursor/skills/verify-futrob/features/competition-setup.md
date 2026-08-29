# Competition setup

An organizer creates an organization, a competition draft, and continues in setup. The same backend chain can be smoked with the CLI golden path through publish and fixture. This feature does not include Match Center or officializing results.

## Sub-features

- `setup-org` creates an organization from `/orgs/new` or from the organizer onboarding path.
- `setup-draft` creates a draft from `/orgs/$orgId/competitions/new` with `Crear competición`.
- `setup-wizard` opens `/orgs/$orgId/competitions/$competitionId/setup` with steps `information`, `format`, `rules`, `participants`, `review`.
- `setup-cli-twin` runs `e2e-golden-path` against the live API (org → teams → entries → publish → fixture).
- `setup-forbidden` hides or disables `Crear competición` when the actor lacks `competitions.update`.

## How to get to it (user POV)

- Onboarding path `Organizar` (intention → organization → competition → account → confirm) then the returned setup URL.
- After a completed onboarding, `/orgs/new` → `Crear organización` → `/orgs/$orgId/competitions/new`.
- Open an existing draft's setup URL with `?step=information` (or format/rules/participants/review).
- From a terminal, after `npm run dev`: `npm run cli -- e2e-golden-path --actor <actorId>`.

## Driving it with verify-futrob

Preconditions:

- Signed-in actor that can create an organization (completed onboarding is enough for `/orgs/new`).
- `helpers/verify-futrob doctor` exits 0.
- Prefer Postgres `DATABASE_URL`. In-memory API loses orgs on API restart.
- CLI twin needs `FUTROB_INTERNAL_JOB_SECRET` equal to `apps/api/.env` and `--actor` set.

- **Create org (UI).** Open `/orgs/new`. Heading `Crear organización`. Fill `Nombre de la organización` with `Verify Org <run-id>`. Choose `Crear organización`. The URL becomes `/orgs/<organizationId>`.
- **Create draft (UI).** Open `/orgs/<organizationId>/competitions/new`. Heading `Nueva competición`. Fill `Nombre de la competición` (placeholder `ej. Liga Futrob Apertura`), choose a platform under `Plataforma de la competición`, a `Región deportiva`, and a `Formato`. Choose `Crear competición`. The URL becomes `/orgs/<organizationId>/competitions/<competitionId>/setup`.
- **Setup.** The setup view is reachable. Search `step=information` shows heading `Información` and field `Nombre`. Do not claim publish, fixture, or Match Center unless you actually drive those controls in the UI.
- **CLI twin.** From the repo root:

  ```bash
  export FUTROB_INTERNAL_JOB_SECRET="$(grep '^INTERNAL_JOB_SECRET=' apps/api/.env | cut -d= -f2)"
  npm run cli -- e2e-golden-path --actor actor_demo
  ```

  Exit code 0. Stdout contains `Golden path OK` and JSON with `organizationId`, `competitionId`, `fixturePlanId`, `encounterCount`. Save stdout to evidence. This proves the API chain, not the web wizard.
- **Proof.** UI: screenshot + ARIA of the new org home and of setup `Información`. CLI: command transcript with exit 0. Record both entry points if both were used; if only CLI ran, say the UI entry is unverified.

## Gotchas

- Organizer onboarding creates a draft **and** an org in one finish action. `/orgs/new` is a later second org. Do not mix the two recipes without saying which entry you used.
- `Crear competición` is hidden when `canCreate` is false. That is a permission outcome, not a missing button bug.
- `e2e-golden-path` stops at fixture. It does not sync EA, select official matches, or publish a portal.
- Fixture-managed encounters reject manual `snapshot-set` with 409 `fixture_managed_conflict`.
- Unique org names: reuse of `Verify Org <run-id>` can fail. Always include the run id.
- Never treat the CLI twin as a substitute for the UI entry points listed above.
