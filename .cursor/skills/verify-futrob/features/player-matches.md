# Player matches

The personal matches surface lists `ProviderMatch` rows for the ExternalClub selected in context. It is not the official results history. Without a club association it shows an empty state and must not query the provider.

## Sub-features

- `matches-entry` opens Mis partidos from `/player` or from `/player/matches`.
- `matches-needs-club` shows `Asocia un club para ver partidos recientes` when the profile has no club association.
- `matches-views` exposes radios `Todos`, `Liga`, `Playoff`, `Amistosos` once matches can load.
- `matches-detail` opens `/player/matches/:providerKey/:externalMatchId` from `Ver partido` and keeps `view` / `sort` in the URL.
- `matches-vs-official` keeps official standings off Mis partidos. `/player/statistics` is `Mis estadísticas`, the personal EA recent-profile.

## How to get to it (user POV)

- Complete player onboarding, then open `/player` and choose `Abrir Mis partidos`.
- Open `/player/matches` directly (default search `view=all`).
- From a match row, choose `Ver partido`.
- Open `/player/statistics` for the personal EA recent profile (`Mis estadísticas`).

## Driving it with verify-futrob

Preconditions:

- Signed-in actor with **completed** player onboarding.
- `helpers/verify-futrob doctor` exits 0.
- Seed proof uses an actor **without** a `PlayerExternalClubAssociation` unless the run documents a linked club.

- **Workspace entry.** Open `/player`. Choose `Abrir Mis partidos`. The URL is `/player/matches` (search includes `view=all`). The heading is `Mis partidos`.
- **Needs club.** With no club association, an empty state title `Asocia un club para ver partidos recientes` is visible. The run must not show a provider error that implies a failed EA fetch for this empty case.
- **Direct route.** Open `/player/matches`. Same heading and empty or populated region. If populated, the radiogroup includes `Todos`, `Liga`, `Playoff`, `Amistosos`. Choosing `Todos` keeps `aria-checked=true` on that radio. The region name for all-matches is `Todos los partidos`.
- **Official split.** Open `/player` and choose `Abrir tu perfil`, or open `/player/statistics`. The heading is `Mis estadísticas`. A ready profile may also show the player display name. This page is the EA recent game-profile, not official competition standings. Mis partidos must not present official standings or dispute admin.
- **Detail (only if a row exists).** Choose `Ver partido` on a row. The URL matches `/player/matches/<providerKey>/<externalMatchId>` and preserves `view` and `sort`. Invalid `providerKey` shows the feature `not_found` state without a backend fetch.
- **Proof.** Screenshot + ARIA of the needs-club empty state (seed) or of a populated `Todos` list plus the statistics page heading. Record whether a club was linked.

## Gotchas

- There is no Recientes time-window tab. `view=recent` in the URL is remapped to `all`. Radios `Todos` / `Liga` / `Playoff` / `Amistosos` filter provider match mode, not calendar days.
- KPI on Mis partidos follow the active **view**, not official standings.
- `No jugaste` on a row is valid when the identifier did not appear for the selected club. Do not treat it as a load error.
- Linking a club during this recipe is a different feature (EA search). If you link one, say so; do not silently switch the empty-state proof.
- Official standings and disputes stay off this list. `/player/statistics` (`Mis estadísticas`) is the personal EA recent-profile, not a separate official-history list.
