# Futrob verification map

This directory is the maintained source for verifying user-facing Futrob behavior. Read this index before driving, then use the matching feature file as the recipe.

## Baseline preconditions

- Repo root is the Futrob monorepo. Node 24. `vp` is available via `node_modules/.bin`.
- Env files exist: `apps/web/.dev.vars`, `apps/auth/.dev.vars`, `apps/api/.env`. Secrets aligned as in the skill Launch section.
- Run `.cursor/skills/verify-futrob/helpers/verify-futrob doctor` and require web `:3000`, API ping, and auth health.
- Never start a second stack on `:3000` / `:8787` / `:8788`. Never drive an instance this run did not health-check.
- Default locale is Spanish. Assert Spanish copy unless the run switched language.
- Evidence lives in `.cursor/skills/verify-futrob/evidence/<run-id>/` and survives cleanup.

## Driving conventions

- Start every recipe from the baseline unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or coordinates.
- Treat every command as literal. Keep quoted names unchanged.
- Drive the browser through the session browser tools. Drive the API through `npm run cli --`.
- After a mutation, read the value back from a second user-facing view.
- Restore disposable accounts and orgs when the recipe created them. Do not delete proof artifacts.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with Futrob identity visible.
- CLI proof includes the command, stdout, stderr, and exit code.
- Record the feature id and entry point used with every artifact.
- An unreachable path is `verified-unreachable` only with the concrete prerequisite and the route attempted.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 and one paragraph. Then exactly four H2s: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify-futrob`, `Gotchas`.

## Features

- [Landing](./landing.md) covers the public marketing page, CTAs, and the mechanism section. **Seed proof target.**
- [Auth](./auth.md) covers login, signup, session gate, and secret-mismatch failure.
- [Onboarding (player)](./onboarding-player.md) covers intention → optional account/club → `/player`.
- [Player matches](./player-matches.md) covers personal matches, empty club state, and official stats separation.
- [Competition setup](./competition-setup.md) covers org + draft + setup in the UI, with the CLI golden path as the API twin.

## Not mapped yet (do not fake-drive)

- Public competition portal — no public routes.
- Match Center / official selection / confirmation — no scheduling or results UI.
- Native mobile — auth foundation only; `AC-MOB-*` requires iOS/Android builds.
- Onboarding invitation and organizer paths — real, but not in this seed; do not claim them via the player path.
- Player club / game-account / competitions / invitations — live routes (`/player/ea-clubs`, `/player/game-accounts`, `/player/competitions`, `/invitations/accept/*`, `/roster-invitations/accept/*`). Visible from `/player` (`Añadir club`, `Vincular cuenta`, sidebar). Not in this seed.
