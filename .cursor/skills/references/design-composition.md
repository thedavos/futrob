# Shared workflow for Futrob design compositions

Read this reference when using `create-page`, `create-section`, `create-kpis`, or
`create-empty-state`. Paths in backticks below are relative to the repository root.

## Contract and reference selection

[design.md](../../../design.md) is the shared design authority. Read the relevant
composition, typography, tokens and states before implementation. Reuse its existing
roles and semantic tokens; do not copy their values into another design contract.
For web authoring, follow [futrob-stylex](../futrob-stylex/SKILL.md).

Start with Inicio, then select the closest recent page for the requested job. Check
the current source and its story, not just its filename or modification timestamp:

```bash
git log -10 --format='%h %ad %s' --date=short -- apps/web/src/modules
rg --files apps/web/src/modules packages/ui/src -g '*.stories.tsx' -g '*page.tsx'
```

Inspect the relevant file's history when needed. A recent mechanical edit does not
make a legacy composition canonical. If a reference moved, locate its replacement
with `rg`; if code and `design.md` disagree, identify the discrepancy and follow the
current design contract unless the user's request changes it.

Reference map, verified against the September 2026 checkout:

| Reference | What to reuse | Source and executable examples |
| --- | --- | --- |
| Inicio | Page hierarchy, independent sections, partial loading and cached-data errors | `apps/web/src/modules/player-home/presentation/player-home-page.tsx` and `player-home-page.stories.tsx` in the same folder |
| Inicio performance | Dashboard KPI composition | `apps/web/src/modules/player-home/presentation/home-performance.tsx`; states in the Inicio story |
| Mis estadísticas | KPIs with context, period selection and partial metric availability | `apps/web/src/modules/statistics/presentation/player-profile/player-profile-kpis.tsx`, `player-statistics-page.tsx` and `player-statistics-page.stories.tsx` in the same folder |
| Explorar competiciones | Recent breadcrumb and page header only; this page is currently a shell | `apps/web/src/modules/teams/presentation/player-competitions-explore-page.tsx`; `Explore` in `player-competitions-page.stories.tsx` in the same folder |
| Datos de juego | Recent header, account setup, form and submission states | `apps/web/src/modules/teams/presentation/player-game-accounts-page.tsx` and its `.stories.tsx` sibling |
| Inicio sections | Contextual list/empty compositions and local recovery | `apps/web/src/modules/player-home/presentation/home-competitions-card.tsx`, `home-invitations-card.tsx`, `home-block-error.tsx` and `home-skeletons.tsx` |

Read only references relevant to the task. Use them for visual and interaction
patterns; do not import private components across modules or duplicate their business
rules. Mis partidos summary KPIs are legacy, not a third KPI pattern.

## Compose in the correct layer

- Infer the actor, destination, main task, data source and states from the request and
  neighboring code. Ask only for missing information that changes the implementation.
- Product compositions belong in the owning app module's `presentation/` directory.
  Reuse public `@futrob/ui` primitives after checking their actual props/exports.
  Add shared primitives only for a real reusable contract, without product dependencies.
- Use existing text components / `typography.*`, semantic colors, spacing, corners
  and responsive conventions. Keep Grafito + Lima for both theme aliases. Do not
  introduce local palettes, font scales, Tailwind, or decorative card nesting.
- Keep new copy in the existing ES/EN translation system. Preserve semantic headings,
  keyboard focus, accessible names and touch targets defined in `design.md`.
- Consume existing view models, query hooks and public contracts. Preserve
  `EffectiveAccess` gating; do not infer permissions from role strings. Distinguish EA
  data from approved official statistics. Do not invent endpoints or business metrics.
- For a requested visual prototype without a data contract, use typed fixtures in the
  preview/story and report the integration gap; do not insert fake production data.
- These web references do not authorize a second native implementation. If the user
  targets Expo, use native primitives and `@futrob/ui-tokens`, with a supported native
  preview; do not import DOM/StyleX or add a new Storybook platform just for this task.

## Composition and Storybook delivery

Create or update the composition and, when the existing harness supports it, a
colocated `.stories.tsx`. Prefer extending the owning page's story when it already
demonstrates the block; do not duplicate coverage solely to add a file.

- Mirror current sibling CSF3 stories with `Meta` / `StoryObj` from
  `@storybook/react-vite`, a `Playground`, and named scenarios for relevant states.
- Product stories use `Product/<Area>` under `apps/web`; UI primitives stay in
  `packages/ui`. Read `.storybook/main.ts` before adding mocks.
- Reuse the current story clients, typed fixtures, i18n provider, isolated QueryClient
  and memory router as needed. Stub navigation destinations. Stories must work without
  real auth, API, EA requests, Workers bindings or secrets.
- Choose meaningful scenarios from ready, loading, empty, filtered-empty, missing
  prerequisite, unavailable metric, permission, recoverable error and cached-data
  refresh. Include only states supported by the component and its owning contract.
- Exercise recovery/filter/CTA behavior when applicable; a static screenshot is not
  proof that an action works. Verify narrow and desktop layouts, long ES/EN copy,
  keyboard behavior and relevant accessibility checks.
- Run repository checks (`npm run check`, `npm run test`, and applicable typechecks)
  and `npm run storybook:build` for changed stories. Inspect rendered stories when a
  browser is available. Report actual results and blockers; a build alone is not
  visual verification. If a story cannot run, explain the concrete dependency and
  provide the supported isolated preview where feasible.

Finish with the composition and story paths, references used, covered states and
validation results. Do not describe a generated story as verified unless it ran.
