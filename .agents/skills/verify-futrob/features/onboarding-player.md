# Onboarding (player)

After signup, a new actor picks `Empezar como jugador`, may skip EA details, confirms, and reaches the personal player space at `/player` without creating an organization.

## Sub-features

- `onb-intention` shows three paths: `Organizar`, `Unirme`, `Empezar como jugador`.
- `onb-player-account` opens `Configura tus datos de juego` and allows `Omitir por ahora`. `Guardar y continuar` stays disabled until a field has a value.
- `onb-player-club` opens `Asocia tu club EA` and allows skip.
- `onb-player-club-unavailable` when EA fails while resolving a chosen club, finishing still lands on `/player` and shows the warning `Tu club quedó sin asociar` with link `Ir a Clubes EA` and button `Cerrar aviso`.
- `onb-player-review` shows `Confirma tu configuración` with `Perfil de jugador listo · Datos EA para después` when skipped.
- `onb-player-finish` submits `Entrar a mi espacio` and lands on `/player` with heading `Inicio`.
- `onb-player-guard` sending an incomplete actor to `/player` returns them to `/onboarding`.

## How to get to it (user POV)

- Finish `/signup` (new account always enters onboarding).
- Open `/onboarding` or `/onboarding/intention` while signed in and incomplete.
- Choose `Empezar como jugador`, then `Continuar`.
- Optional: fill `Identificador de EA` and choose `Guardar y continuar`, or choose `Omitir por ahora` on account and club steps.
- Confirm with `Entrar a mi espacio`.

## Driving it with verify-futrob

Preconditions:

- A disposable signed-in actor that has **not** completed onboarding (fresh signup from [auth](./auth.md)).
- `helpers/verify-futrob doctor` exits 0.
- Do not use the organizer or invitation radios in this recipe.

- **Intention.** Open `/onboarding/intention`. The radiogroup `Intención del onboarding` contains `Organizar`, `Unirme`, and `Empezar como jugador`. `Continuar` is disabled until a path is chosen.
- **Pick player.** Choose `Empezar como jugador`, then `Continuar`. The URL becomes `/onboarding/game-account`. The heading is `Configura tus datos de juego`.
- **Skip account.** `Guardar y continuar` is disabled while the form is empty. Choose `Omitir por ahora`. The URL becomes `/onboarding/club`. The heading is `Asocia tu club EA`.
- **Skip club.** Choose `Omitir por ahora`. The URL becomes `/onboarding/review`. The heading is `Confirma tu configuración`. Visible copy includes `Perfil de jugador listo · Datos EA para después` or `Sin club asociado por ahora`.
- **Finish.** Choose `Entrar a mi espacio`. The URL becomes `/player`. Wait past `Cargando tus datos…`. The heading is `Inicio`. The command-bar empty identity (no club/org) is `Sin organización`; the account-menu trigger still shows the given name. After a skip-skip finish the hero is `Empieza con tus datos de juego` with button `Registrar identificador`. Sidebar links include `Mis partidos` and `Mis estadísticas`. Unused catalog strings `Abrir Mis partidos`, `Abrir tu perfil`, `Espacio personal`, and `Tu espacio en Futrob` are not on this page.
- **Guard (separate incomplete actor).** Open `/player` before finishing review. The app must not show the completed home (`Inicio` with the player sidebar); it returns to `/onboarding`.
- **Proof.** Screenshot + ARIA of intention, of review before confirm, and of `/player` after finish. Record that the path was `player`, not `organization` or `invitation`.

## Gotchas

- `/onboarding/team` only redirects. Do not treat it as a live step.
- Club search hits EA through the API. Skipping club is the safe seed proof; a live search is optional and rate-limited.
- If EA is unavailable after a club was chosen, the finish response carries `externalClubAssociation: "failed"` and `/player?clubAssociation=failed` shows the warning. A club EA does not know (404) still blocks the finish. Only claim the warning path from a real provider failure or the Storybook story `Product/Onboarding/Flow › Club Association Failed`.
- Re-finishing must not create a second organization or competition. This recipe never creates those.
- Organizer (`Organizar`) and invitation (`Unirme`) are other entry points. Completing the player path does not verify them.
- `/player` shows `Cargando tus datos…` while the status request runs. Wait for the heading, not the pending copy.
- The incomplete-actor guard lands on `/onboarding` and typically syncs to `/onboarding/intention`. The player radio may stay selected; that is not a finished workspace.
- Command-bar empty identity is `Sin organización` (`shell.identity.empty`). Do not look for `Tu espacio en Futrob`. The account-menu trigger still shows the given name.
