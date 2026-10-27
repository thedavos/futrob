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
- After a completed onboarding, `/orgs/new` → `Crear organización` → `/orgs/$orgId/competitions`. Empty index CTA is `Nueva competición`. Org home `/orgs/$orgId` uses `Crear competición`.
- Open an existing draft's setup URL with `?step=information` (or format/rules/participants/review).
- From a terminal, after `npm run dev`: `npm run cli -- e2e-golden-path --actor <actorId>`.

## Driving it with verify-futrob

Preconditions:

- Signed-in actor that can create an organization (completed onboarding is enough for `/orgs/new`).
- `helpers/verify-futrob doctor` exits 0.
- Prefer Postgres `DATABASE_URL`. In-memory API loses orgs on API restart.
- CLI twin needs `FUTROB_INTERNAL_JOB_SECRET` equal to `apps/api/.env` and `--actor` set.

- **Create org (UI).** Open `/orgs/new`. Heading `Crear organización`. Fill `Nombre de la organización` with `Verify Org <run-id>`. The form also has `Slug`, `Zona horaria`, and `Escudo`; accept the generated slug and default timezone unless the run is proving those fields. Choose `Crear organización`. The URL becomes `/orgs/<organizationId>/competitions` (heading `Competiciones`). Copy that id from the address bar; do not retype it from memory or OCR.
- **Create draft (UI).** From the competitions index empty state, choose `Nueva competición`, or open `/orgs/<organizationId>/competitions/new` with the address-bar id. Heading `Nueva competición`. Fill `Nombre de la competición` (placeholder `ej. Liga Futrob Apertura`), choose a platform under `Plataforma de la competición`, a `Región deportiva`, and a `Formato`. Choose form submit `Crear competición`. The URL becomes `/orgs/<organizationId>/competitions/<competitionId>/setup`.
- **Setup.** The setup view is reachable. The header title is `Configurar competición` with a `Borrador` badge (not `Configurar <name>`). Stepper label `Información`, body heading `Información general`, and field `Nombre de la competición` are visible (default when `?step=` is absent). The action bar has `Guardar borrador` and `Continuar`. Do not claim publish, fixture, or Match Center unless you actually drive those controls in the UI.
- **Review.** Open `?step=review`. Heading `Resumen de configuración`. Left-column summary blocks `Información general`, `Formato`, `Reglas`, and `Participantes` each have `Editar` (`aria-label` `Editar {title}`). `Participantes` sits below the fold when the window is short — scroll the left column; a screenshot that stops at `Reglas` is incomplete. Right-column `Vista previa` and `Lista para publicar` have no `Editar`. The action bar has `Guardar borrador`, no `Continuar`, plus `Abrir inscripciones` or `Cerrar inscripciones`, and `Publicar competición`. Do not expect vueltas, equipos previstos, a reglamento, team shields, or invitation counts.
- **Participants.** Open `?step=participants` (or the stepper `Participantes`) using the organization and competition ids from the address bar after create, not from a screenshot OCR. The action bar includes `Guardar borrador`, `Continuar`, and `Abrir inscripciones` or `Cerrar inscripciones`. It does not include `Publicar competición`. Empty body title `Aún no hay equipos`; `Invitar equipo` may show; driving invitations is not this seed.
- **CLI twin.** From the repo root:

  ```bash
  export FUTROB_INTERNAL_JOB_SECRET="$(grep '^INTERNAL_JOB_SECRET=' apps/api/.env | cut -d= -f2)"
  npm run cli -- e2e-golden-path --actor <actorId-from-signup>
  ```

  Exit code 0. Stdout contains `Golden path OK` and JSON with `organizationId`, `competitionId`, `fixturePlanId`, `encounterCount`. Save stdout to evidence. This proves the API chain, not the web wizard.
- **Proof.** UI: screenshot + ARIA of the new org home and of setup `Información`. CLI: command transcript with exit 0. Record both entry points if both were used; if only CLI ran, say the UI entry is unverified.

## Gotchas

- Organizer onboarding creates a draft **and** an org in one finish action. `/orgs/new` is a later second org. Do not mix the two recipes without saying which entry you used.
- `Crear competición` is hidden when `canCreate` is false. That is a permission outcome, not a missing button bug.
- `e2e-golden-path` stops at fixture. It does not sync EA, select official matches, or publish a portal.
- Fixture-managed encounters reject manual `snapshot-set` with 409 `scheduling.fixture_managed_conflict`.
- JSON mutating API calls without `Content-Type: application/json` return 415 `api.unsupported_media_type`. The CLI SDK sets that header; do not treat a 415 from raw curl as a domain failure. Malformed JSON is 400 `api.validation_error`.
- After `Crear organización` the URL is `/orgs/$orgId/competitions` (heading `Competiciones`, empty `Sin competiciones todavía`, CTA `Nueva competición`). `/orgs/$orgId` is a real organization home (`Crear competición`), not a stub, and is not the create redirect target.
- On Postgres, `--actor` must be a real `actors.id` from signup. Invented ids such as `actor_demo` fail the actor foreign key.
- Unique org names: reuse of `Verify Org <run-id>` can fail. Always include the run id.
- The draft form also has `Edición del juego` and a teams/dates/cover section. Defaults (FC 27, min 2 teams) allow submit without touching those extras.
- After `Crear competición`, the URL is `/orgs/$orgId/competitions/$competitionId/setup` without `?step=`. The wizard defaults to `information`. The header title is `Configurar competición` (not the competition name). Assert the stepper `Información`, the body heading `Información general`, and field `Nombre de la competición`.
- The competitions index empty CTA is `Nueva competición`. A non-empty index lists rows only (no header create button). Org home `/orgs/$orgId` still exposes `Crear competición` when the actor has `competitions.update`. The draft form submit label remains `Crear competición`.
- `Guardar borrador` sits on the setup action bar with `Continuar` (steps 1–4) or with registration/publish (review). It is not a substitute for `Crear competición` or `Publicar competición`.
- A mistyped organization or competition id on setup (`?step=review` and `?step=participants` included) yields a load error (`No se pudo cargar el borrador de la competición`). Paste ids from the address bar or from `comp-show` / Postgres. Screenshot OCR commonly swaps `8`/`9` in UUIDs (`b88e` vs `b89e`, `a8d0` vs `a9d0`); that is the same 404 `authorization.scope_not_found`, not wizard-enforced sequencing. Re-entry with the real ids loads `Configurar competición` and `Borrador`.
- A mistyped organization id on `/orgs/<id>/competitions/new` yields `scope-not-found` and the same forbidden copy as a real permission miss. Always paste the id from the address bar after `Crear organización`.
- Never treat the CLI twin as a substitute for the UI entry points listed above.
