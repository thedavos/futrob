---
name: create-kpis
description: Create or update Futrob KPI and stat compositions using the Inicio or Mis estadísticas patterns, existing typography and tokens, with relevant Storybook states. Use for UI metric summaries, not defining new analytics formulas.
---

# Create Futrob KPIs

Read [design.md](../../../design.md), especially “Stats: composiciones de producto”,
and the [shared composition workflow](../references/design-composition.md).

## Choose the composition

Identify the destination, available metrics, units, period, source and absent-data
semantics. Use the current source of these references:

- **Inicio:** `apps/web/src/modules/player-home/presentation/home-performance.tsx`.
  Use for a dashboard summary: lime icon island, label and value, without hint.
- **Perfil / Mis estadísticas:**
  `apps/web/src/modules/statistics/presentation/player-profile/player-profile-kpis.tsx`.
  Use when the value needs a unit, period or breakdown: muted icon without island,
  label, value and hint.

Choose by the meaning of the data when the user does not specify a pattern. Do not
mix the two compositions or copy the legacy `SummaryCard` from Mis partidos. Keep
the selected pattern's responsive behavior and equal scales for peer metrics.

## Implement

1. Read the existing `Stat`, `StatLabel`, `StatValue`, `StatHint` and `StatGroup`
   contracts in `packages/ui/src` and their current stories. Compose the product grid,
   panel and icons in the owning module; reuse an existing composition when suitable.
2. Bind to existing typed metrics or presentation props. Keep formulas in their
   existing owner; only display formatting belongs here. Do not label provider data
   as official or fabricate comparisons, trends, percentages or sample sizes.
3. Format numbers and percentages with the current locale. A real zero remains zero;
   unavailable data renders the established muted “—”/unavailable copy. An unavailable
   rating must not appear as `0`. Labels name the data; icons are decorative and values
   are not navigation links.
4. Apply existing typography and tokens through the current primitives and StyleX
   conventions. Keep unit/period hints near their values in the profile composition.
5. Create/update the composition story or owning page story following the shared
   workflow. Cover populated data, real zero, partial/unavailable metrics and narrow
   layout; cover loading, no sample and error only where the owning contract has them.

Deliver the composition and relevant story states, and report the pattern and data
source selected plus the checks actually run.

## Example requests

- “Crea KPIs de partidos, victorias, rating y goles + asistencias como Inicio.”
- “Crea el resumen de rendimiento con unidad y periodo como Mis estadísticas.”
- “Actualiza estos KPIs para distinguir cero de rating no disponible.”
