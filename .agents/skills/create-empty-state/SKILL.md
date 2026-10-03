---
name: create-empty-state
description: Create or update contextual empty states in Futrob pages and sections with existing typography, tokens and relevant stories. Use for first use, no results or missing prerequisites while distinguishing loading, denied access and failures.
---

# Create a Futrob empty state

Read [design.md](../../../design.md) and the
[shared composition workflow](../references/design-composition.md).

## Identify why content is absent

Inspect the host's actual state/view model before writing copy:

| Situation | Message and action |
| --- | --- |
| First use / no records | Explain what will appear; offer the authorized setup/create action if it exists. |
| No filter matches | Keep filters visible; offer clearing/changing them. Do not imply there are no records anywhere. |
| Missing game account or club | Name the missing prerequisite and link to the existing setup route. Do not invent ownership verification. |
| No pending work | Communicate completion/quiet status; an action may be unnecessary. |
| Loading or sync pending | Use the existing loading/progress state; do not prematurely show an empty result. |
| Access denied | Use the permission state and only available recovery actions; do not reveal protected data. |
| Request failed | Show the existing recoverable error treatment and retry if supported; do not label it “no data”. |
| Refresh failed with cached data | Retain content and expose local recovery, following Inicio. |

Only implement situations applicable to the request and the host's contract.

## Compose in context

- Inspect the empty branches of
  `apps/web/src/modules/player-home/presentation/home-competitions-card.tsx` and
  `home-invitations-card.tsx`, with scenarios in `player-home-page.stories.tsx`.
  Use `home-block-error.tsx` to distinguish failure from absence.
- For a standalone empty region, inspect `packages/ui/src/components/empty-state.tsx`
  and `packages/ui/src/stories/empty-state.stories.tsx`. Reuse `EmptyState`, title,
  description, optional icon and actions where suitable. For a small block inside a
  panel, follow Inicio's inline composition rather than nesting a full empty panel.
- Choose the heading level to fit the host. Check primitive capabilities; do not
  invent an `as` prop. Reuse the appropriate text primitive when semantics require it.
- Use a short, specific title and useful supporting copy in the existing ES/EN
  translation system. Add one primary next step only when the actor can take it.
  Link to real destinations or bind real callbacks; omit pointless disabled CTAs.
- Reuse current typography and semantic tokens. Icons are decorative when the text
  already conveys their meaning. Do not rely on color alone or add illustrations,
  new palettes or bespoke type scales without a user request.

## Story and verification

Create/update the composition and its story, or add scenarios to the host page story.
Cover the requested absence reason, permitted action/no-action cases when applicable,
and narrow/long-copy layout. If the host can confuse empty with loading or error,
include those neighboring states to demonstrate the distinction.

Verify the CTA's actual callback/navigation or filter-reset behavior using isolated
story fixtures. Follow the shared validation workflow and report covered states and
checks, including any concrete reason a story could not be supplied or run.

## Example requests

- “Crea el estado vacío de competiciones con la composición actual de Inicio.”
- “Añade un estado sin resultados que permita limpiar los filtros.”
- “Muestra qué falta cuando el jugador todavía no ha asociado su club.”
