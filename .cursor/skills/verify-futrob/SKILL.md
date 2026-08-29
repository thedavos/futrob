---
name: verify-futrob
description: Drive the live Futrob web app (landing, auth, onboarding, player space, competition setup) and the product API via apps/cli. Use when proving a user-facing change, after a UI/auth/onboarding/org flow, or before claiming a web feature works.
---

# Verify Futrob

Drive the **real** product the way a user does. Primary surface is `apps/web` at `http://localhost:3000`. Complementary harness is `npm run cli --` against `apps/api` on `:8787`. Do not treat Storybook, Vitest, or CLI offline smokes as proof of a user path.

Read `features/README.md` before driving. A proof that uses one convenient entry when the map lists others is incomplete.

Spanish (`es`) is the default product locale. Use the Spanish accessible names in this skill unless the run explicitly switched locale.

## Launch

From the repo root. Env files must already exist (they are gitignored): `apps/web/.dev.vars`, `apps/auth/.dev.vars`, `apps/api/.env`. `INTERNAL_JOB_SECRET` must match web ↔ API. `BETTER_AUTH_SECRET` must match web ↔ auth. `FUTROB_API_BASE_URL` in web must be `http://localhost:8787/api/v1`.

```bash
.cursor/skills/verify-futrob/helpers/verify-futrob launch
```

Ready when **all three** answer:

| Service | Probe |
| --- | --- |
| Web | `GET http://localhost:3000/` → HTTP 200 and body contains `Futrob` (Vite+ listens on `[::1]`; `127.0.0.1:3000` fails) |
| API | `GET http://localhost:8787/api/v1/meta/ping` → `{"ok":true,"service":"futrob","apiVersion":"v1"}` |
| Auth | `GET http://localhost:8788/meta/health` → `{"ok":true,"service":"futrob-auth"}` |

The helper writes a lock under `.cursor/skills/verify-futrob/.run/` (pid, pgid, log). Teardown is `cleanup`, never `pkill` by process name.

**Do not launch** if `:3000`, `:8787`, or `:8788` is already listening. Those ports are shared with a normal `npm run dev`. Double-driving a shared instance corrupts the user's session and D1 persist-to at `apps/web/.wrangler/state`. If doctor says the ports belong to a foreign process, stop and tell the operator.

Optional attach (read-only doctor + drive, no launch/cleanup of the stack) only when the operator explicitly said to reuse their already-running `npm run dev` **and** `doctor` exits 0. Still do not start a second stack.

Without `DATABASE_URL`, `apps/api` uses in-memory stores and **wipes orgs on every API hot-reload**. Prefer a migrated Postgres `DATABASE_URL` for any mutating org/competition proof.

## Doctor

Run first whenever anything looks off, before the first drive, after any failed drive, and on each fresh CLI session:

```bash
.cursor/skills/verify-futrob/helpers/verify-futrob doctor
```

Exit 0 only when: the three probes above succeed, and either (a) the lock file's pid/pgid still owns the listeners, or (b) attach mode is in effect and the operator owned the stack. A 200 login with a later unauthenticated BFF usually means `BETTER_AUTH_SECRET` mismatch — doctor does not catch that; the auth feature map does.

## Drive

Two harnesses. Prefer the feature file's recipe over improvising.

### Browser (web UI)

Use the session browser (navigate, snapshot, click, fill, screenshot). Stable handles are **ARIA roles and accessible names**, then route paths. Spanish names from this repo:

| Control | Handle |
| --- | --- |
| Brand home | link `Futrob` |
| Landing login | button/link `Iniciar sesión` |
| Landing signup | button/link `Crear cuenta` |
| Hero primary CTA | `Crear cuenta` → `/signup` |
| Hero secondary CTA | `Ver cómo funciona` → `#mecanismo` |
| Landing nav landmark | `Acceso` |
| Login heading | `Inicia sesión` |
| Login email | textbox named `ejemplo@correo.com` (visible label `Correo electrónico`) |
| Login password | textbox named `Ingresa tu contraseña` (visible label `Contraseña`) |
| Login submit | button `Iniciar sesión` |
| Signup heading | `Crea tu cuenta` |
| Signup name | textbox named `Ingresa tu nombre completo` (visible label `Nombre completo`) |
| Signup email | textbox named `ejemplo@correo.com` |
| Signup password | textbox named `Crea una contraseña` |
| Signup submit | button `Crear cuenta` |
| Onboarding intention | radiogroup `Intención del onboarding` |
| Player path | radio `Empezar como jugador` |
| Organizer path | radio `Organizar` |
| Intention continue | button `Continuar` |
| Skip optional onboarding | button `Omitir por ahora` |
| Player finish | button `Entrar a mi espacio` |
| Player home title | `Tu espacio de jugador` |
| Open matches | `Abrir Mis partidos` |
| Match view radios | `Todos`, `Liga`, `Playoff`, `Amistosos` |
| Open profile | `Abrir tu perfil` |
| Org name | textbox `Nombre de la organización` |
| Create org | button `Crear organización` |
| Competition name | textbox `Nombre de la competición` |
| Create competition | button `Crear competición` |

Do not drive by coordinates or tab order. After each mutation, snapshot the resulting URL and a visible heading — not only the click.

### CLI (product API)

Service auth, not browser cookies:

```bash
export FUTROB_INTERNAL_JOB_SECRET="$(grep '^INTERNAL_JOB_SECRET=' apps/api/.env | cut -d= -f2)"
npm run cli -- <command> --actor <actorId> [--json]
```

`e2e-golden-path` is the API golden path (org → draft → teams → entries → publish → fixture). It does **not** prove the web UI, official selection, or the public portal.

```bash
npm run cli -- e2e-golden-path --actor actor_demo
```

Expected domain failures (not harness bugs): `snapshot-set` → 409 `fixture_managed_conflict` on fixture-owned encounters; `provider-health` → 403 without `superusersManage`.

## Evidence

Directory (created by launch, **never deleted by cleanup**):

```text
.cursor/skills/verify-futrob/evidence/<run-id>/
```

Print the path:

```bash
.cursor/skills/verify-futrob/helpers/verify-futrob evidence-dir
```

Proof standards:

- Exercise the real user path (browser routes or CLI commands the operator would run). Do not call test-only endpoints or set domain state through internal setters.
- Capture the **action and the resulting state**: ARIA snapshot + screenshot for UI (page must show `Futrob` or a product heading); command + stdout + stderr + exit code for CLI.
- After a mutation, read the value back from a second user-facing view (reload the route, reopen the list, or `comp-show` / `org-mine`).
- Record the feature file id and the entry point used in `evidence/<run-id>/NOTES.md`.
- Mocks only at a production boundary that already isolates the system (EA Clubs). Club search against live EA is optional; if skipped, say so. Never mock Better Auth or the BFF for an auth proof.
- A dry-run or Storybook story is not proof.

Suggested filenames: `landing/hero.png`, `landing/hero.aria.yml`, `landing/cta-signup.png`. If the browser tool writes to a temp directory, copy the files into this evidence path before cleanup.

## Cleanup

```bash
.cursor/skills/verify-futrob/helpers/verify-futrob cleanup
```

Kills **only** the process group started by `launch` (and listeners that still share that group). Removes `.run/` lock and scratch. Leaves `evidence/` intact. After cleanup, confirm the evidence directory still exists **and** that `:3000` / `:8787` / `:8788` are free. If a listener remains with a different process group, stop and report it — do not `pkill` by name.

If launch failed partway, still run cleanup so ports are not stranded.

## Helpers

All invocations are from the repo root. The script is executable.

| Command | Purpose |
| --- | --- |
| `helpers/verify-futrob launch` | Start `npm run dev` if ports are free; wait until doctor-ready |
| `helpers/verify-futrob doctor` | Read-only: ports, pids, three health probes |
| `helpers/verify-futrob evidence-dir` | Print (and create) this run's evidence directory |
| `helpers/verify-futrob cleanup` | Tear down what launch started; keep evidence |

## Out of scope until the map grows

These are real product destinations. Do not claim them verified through a different path:

- Public competition portal (no public routes yet)
- Match Center / official selection / confirmation (no scheduling/results UI)
- Native iOS/Android (`AC-MOB-*` — Expo web is not that proof)
- Superuser / provider-health admin

## Maintenance

After the app changes, run `/maintain-verification-skill` against this skill so the feature map stays honest.
