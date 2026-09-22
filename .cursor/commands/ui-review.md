# Review Futrob UI

Read [design.md](../../design.md) as the design authority and the
[shared composition workflow](../skills/references/design-composition.md) for current references.
Compare with Inicio and the closest recent page/story; a recent edit alone does not make a legacy pattern canonical.

1. Identify the requested routes, actors, states and applicable acceptance criteria. Review only the relevant surfaces.
2. Verify existing typography roles, semantic tokens and Grafito + Lima in both theme aliases; both currently resolve to the same palette. Check ES/EN at narrow, tablet and desktop widths.
3. Check web composition against [futrob-stylex](../skills/futrob-stylex/SKILL.md) and actual public `@futrob/ui` contracts. Native UI uses its own primitives and shared tokens.
4. For KPIs, check the Inicio or Mis estadísticas composition in `design.md`; distinguish unavailable metrics from real zero. Mis partidos summary KPIs are legacy.
5. Check keyboard order, visible focus, dialog focus restoration, accessible names, contrast, touch targets and reduced motion where relevant.
6. Exercise applicable loading, empty, filtered-empty, prerequisite, permission, error and refresh states. Preserve cached data and successful sections during partial failures. Verify CTA destinations and recovery behavior.
7. For Match Center, preserve both team identities, stable score, round/time, distinct EA-candidate vs official states, selection preview and detail navigation. For brackets/rankings, verify accessible equivalents, byes and official-table vs performance-ranking semantics.
8. For public routes, verify crawlable published content and metadata without exposing private evidence or tokens. Apply performance/SEO guidance only where relevant.
9. Inspect the current stories and add coverage when fixes change a component contract. For requested fixes, use [create-page](../skills/create-page/SKILL.md), [create-section](../skills/create-section/SKILL.md), [create-kpis](../skills/create-kpis/SKILL.md) or [create-empty-state](../skills/create-empty-state/SKILL.md) according to scope.
10. Report concrete findings with route/component, viewport, state, severity and applicable acceptance ID. Separate observed failures from unverified behavior; state which visual, interaction and build checks ran.
