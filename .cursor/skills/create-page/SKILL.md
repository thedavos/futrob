---
name: create-page
description: Create or compose a Futrob product page using Inicio and relevant recent pages, existing typography and tokens, and Storybook scenarios. Use for a complete screen and its hierarchy, navigation and states.
---

# Create a Futrob page

Read [design.md](../../../design.md) and the
[shared composition workflow](../references/design-composition.md).

## Establish the page contract

Identify the actor, active context, route or parent screen, primary task, available
data and access requirements. Inspect the neighboring route and owning module before
deciding what to add. A request for a composition/preview does not require a new route;
wire navigation when the user asks for an integrated page and contracts are available.

Start with `apps/web/src/modules/player-home/presentation/player-home-page.tsx`
and its story for page hierarchy and independent data blocks. Consult recent pages
from the shared reference map for the closest task:

- Explorar competiciones for breadcrumbs and a simple page header. Its current shell
  does not demonstrate a complete data page.
- Datos de juego for a setup/form page and submission states.
- Mis estadísticas for identity, period filters and data sections.

Check recent history as described in the shared workflow before selecting a reference.

## Compose

1. Define reading order: page header, relevant context/filters, primary content and
   supporting sections. Use `PageHeader`, `PageHeaderTitle`, description and actions
   from `@futrob/ui` as applicable. Keep one page h1 and meaningful section headings.
   Reuse the app shell; do not nest another main landmark inside an existing one.
2. Reuse current layouts, typography and tokens. Adapt the reference to the user's
   task; a form or list does not need Inicio's hero or KPI grid. Keep one primary
   action per context and preserve meaningful return navigation.
3. Compose existing blocks within the owning module. For metric summaries follow
   [create-kpis](../create-kpis/SKILL.md); for contextual absence follow
   [create-empty-state](../create-empty-state/SKILL.md). Load those instructions only
   when needed, and avoid generating duplicate stories for every nested block.
4. Connect existing queries/view models and permission gates. Keep business decisions
   out of JSX. Follow Inicio's independent slot behavior where data loads separately:
   retain successful sections when one fails, and preserve cached content on refresh.
5. Add/update the colocated page story using the current mock clients and router
   harness. Cover ready and the applicable loading, empty, prerequisite, permission
   and error states, plus narrow layout. Include partial failure/refresh only when
   the page supports independently loaded or cached data.

Validate and report using the shared workflow. If data wiring is unavailable, make
the composition reviewable with typed story fixtures and identify what remains.

## Example requests

- “Crea la página de detalle de competición para el organizador.”
- “Crea una página de equipo con la jerarquía y estados de Inicio.”
- “Compón una página de estadísticas con filtro de periodo y datos parciales.”
