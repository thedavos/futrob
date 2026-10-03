---
name: create-section
description: Create or update a section inside an existing Futrob page, reusing recent Inicio blocks, typography and tokens, with relevant Storybook states. Use for a bounded content block rather than a whole page.
---

# Create a Futrob section

Read [design.md](../../../design.md) and the
[shared composition workflow](../references/design-composition.md).

## Fit the host page

Locate the host page and its story. Identify the section's job, heading level,
position, available width, data contract and optional action. Infer these from the
page and request when possible. Keep the surrounding page's reading order and state
ownership intact.

Reference current blocks under `apps/web/src/modules/player-home/presentation/`:

- `home-competitions-card.tsx` for a bounded list, contextual empty state and “view all”.
- `home-invitations-card.tsx` for a summary with pending actions.
- `home-card.tsx` for existing section chrome, where appropriate.
- `home-block-error.tsx` and `home-skeletons.tsx` for local recovery and loading.

Check the shared map and recent history for a closer page reference. These home
components are product references, not a public UI API for other modules.

## Build the block

1. Choose the representation that matches the content: rows/list, table, prose, form
   or metrics. Use a card only when the content is an autonomous unit. Do not add
   nested panels just to make something look like a section.
2. Reuse `SectionTitle` or the appropriate existing heading role and semantic
   section naming. Do not introduce a page h1, app shell, page route or full-page
   loader for a local block. Keep its action aligned with the heading when useful.
3. Use existing typography, semantic tokens and responsive spacing. Preserve DOM
   reading order and allow labels, numbers and actions to fit narrow widths.
4. Keep the component in the owning presentation layer, with typed props/view model
   and callbacks or the host's existing query pattern. Respect access gates. For KPI
   sections follow [create-kpis](../create-kpis/SKILL.md) instead of inventing a layout.
5. Represent relevant empty, loading and error states locally. Keep usable content
   visible on a failed background refresh. Reuse the host's state model rather than
   adding redundant fetches or competing state ownership.
6. Add/update a colocated block story or extend the host page's scenarios. Show the
   populated section in its real width/context and its applicable empty, loading,
   error and action states; use the shared Storybook workflow and checks.

Deliver the integrated block and story coverage. Explain the reused reference and
any unresolved integration dependency.

## Example requests

- “Añade una sección de próximos encuentros debajo del resumen del equipo.”
- “Crea una sección de invitaciones siguiendo los bloques de Inicio.”
- “Agrega una lista de competiciones con estado vacío y reintento local.”
