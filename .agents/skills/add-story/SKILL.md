---
name: add-story
description: Create or update Futrob Storybook stories for existing UI components and product compositions, covering their actual variants, states and interactions. Use when adding or maintaining story coverage without redesigning the component.
---

# Add a Storybook story for a component

Use when the user asks to add, update, or flesh out Storybook coverage for a UI component or product composition.

## Goal

Ship a focused CSF story that documents the **real contract** of the component: variants, density, states, a11y, and Futrob tokens — not a one-off playground dump.

## Preconditions

1. Confirm where the component lives:
   - Design-system primitive / pattern → `packages/ui`
   - Product composition (auth, org, match center, etc.) → `apps/web`
2. Confirm Storybook config at **repo root** (`.storybook/`):
   - UI stories: `packages/ui/src/**/*.stories.@(ts|tsx)`
   - Web stories: `apps/web/src/**/*.stories.@(ts|tsx)`
   - Alias `@/` → `apps/web/src`
3. Read before writing:
   - The component source and its public exports
   - An existing sibling story in the same package (mirror structure)
   - [design.md](../../../design.md) and the AGENTS UI contract
   - If the component is in `@futrob/ui`, prefer composing only `@futrob/ui` primitives (no BC packages, no Better Auth, no Wrangler)

For product compositions, read the [shared composition workflow](../references/design-composition.md).
Start with Inicio and select the closest recent page from its reference map; inspect the current
source and story. For requests that also create a composition, apply the matching skill:
[create-page](../create-page/SKILL.md), [create-section](../create-section/SKILL.md),
[create-kpis](../create-kpis/SKILL.md), or [create-empty-state](../create-empty-state/SKILL.md).
For an existing component, document its actual contract without redesigning it.

## Decide story location and title

| Component location                                                      | Story file                                                                                  | `title` prefix                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `packages/ui/src/components/<name>.tsx` or `packages/ui/src/<name>.tsx` | `packages/ui/src/stories/<name>.stories.tsx`                                                | `Primitives/<Name>` or `Patterns/<Name>` |
| `apps/web/src/modules/<bc>/presentation/<name>.tsx`                     | Colocate: `…/presentation/<name>.stories.tsx` **or** `…/presentation/<feature>.stories.tsx` | `Product/<Area>` (e.g. `Product/Auth`)   |

Rules:

- New UI primitives use colocated `packages/ui/src/components/<name>/<name>.stories.tsx`; keep existing stories in their current location.
- File name: kebab matching the component (`input.stories.tsx`, `logo.stories.tsx`).
- One primary component per story file when practical; group related forms under one Product title when they share a shell.
- Do **not** put product/auth/router stories inside `packages/ui`.

## Required story shape

Use CSF3 + `satisfies Meta<…>`:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Component } from "../components/component";

const meta = {
  title: "Primitives/Component",
  component: Component,
  parameters: { layout: "centered" }, // or "fullscreen" / "padded" when the shell needs it
  args: {
    /* sensible defaults matching product copy in Spanish when user-facing */
  },
  argTypes: {
    /* controls only for real public props — not internal implementation knobs */
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
```

Always include:

1. **`Playground`** — args-driven default (or explicit render if the component needs a wrapper).
2. At least one **contract story** that shows closed variants / density / composition without relying on Controls alone.

## What to cover (checklist)

Walk the component API and mark what applies. Create named exports for each relevant group (prefer several small stories over one overloaded canvas).

### Visual / API contract

- [ ] Closed variants (`variant`, `size`, `dense`, `monochrome`, etc.) — each visible, labeled if not obvious
- [ ] Density: universal 44 px vs `dense` (36 px desktop / 44 px touch) when the primitive supports it
- [ ] Grafito + Lima using semantic tokens; both light/dark aliases resolve to the same current palette
- [ ] Spanish default copy and existing ES/EN translations/providers; check long labels in both locales
- [ ] Existing typography roles and semantic tokens; choose surfaces according to `design.md` and the current composition

### States

- [ ] Default / filled / empty
- [ ] `disabled`
- [ ] `aria-invalid` / error + message (`FieldError` when forms)
- [ ] Loading / pending if the component exposes it
- [ ] Focus-visible treatment (especially if border/ring was recently changed)
- [ ] Empty / zero-data only for pattern stories that own empty states

### Accessibility

- [ ] Accessible name for icon-only controls (`aria-label` / `title`)
- [ ] Decorative vs informative icons/logos documented in a story when the API differs (`title` present vs absent)
- [ ] Form controls associated with visible labels
- [ ] Do not break keyboard focus; avoid `outline` fights (prefer component tokens / `@layer base` patterns already in the DS)

### Product / web stories (extra)

If the story imports `apps/web` modules that touch auth, router, SDK, or Workers:

- [ ] Inspect `.storybook/main.ts`; reuse current module story clients and fixtures before adding mocks or aliases
- [ ] Use an isolated QueryClient, i18n provider and memory router as needed; mirror Inicio or the nearest current page story
- [ ] Never call real Better Auth, D1, EA, or Railway from a story
- [ ] Stub post-success navigation targets so submit flows do not explode

## Implementation steps

1. **Locate** the component and list its exported props / variants from source (do not invent props).
2. **Mirror** an existing story in the same layer; for product UI, prioritize Inicio and the recent-page reference map.
3. **Create or update** the `.stories.tsx` file beside the agreed location.
4. **Import** with the package’s local convention:
   - UI package: relative imports without `.js` extension (Vite + `moduleResolution: Bundler`)
   - Web package: `@/` aliases are fine inside `apps/web` stories
5. **Compose** wrappers with StyleX (`applyProps`, `typography.caption`, `colors.surface`). Prefer flat/line; avoid nested card spam.
6. **Update Storybook** whenever the primitive contract changes (AGENTS / UI contract).
7. **Verify**:
   - `npm run storybook` — story appears under the expected title and renders without console errors
   - Run `npm run storybook:build` for build validation; inspect the rendered story when a browser is available. Report build and visual results separately
8. **Do not** commit `storybook-static/` (gitignored at repo root).

## Naming conventions for exports

- `Playground` — controls-driven entry
- `ClosedVariants` / `Density` / `States` / `WithIcons` / `WithLabel` — descriptive contract slices
- Product: `Login`, `Signup`, or feature names — short and route-aligned
- Prefer `name: "Human label"` only when the export id would be ugly (`WithWordmark` → `name: "With wordmark"`)

## Anti-patterns

- Stories that only screenshot happy path and skip `disabled` / invalid / dense
- Duplicating product business rules inside UI package stories
- Hardcoding hex colors or one-off font sizes instead of `typography.*` / tokens
- Importing `@futrob/<bc>` domain packages into `packages/ui` stories
- Leaving broken imports that need Workers bindings “for later”
- Using `!important` utilities to paper over typography/token conflicts — fix the role/token instead

## Done criteria

- [ ] Story file exists in the correct package path with correct `title`
- [ ] Playground + at least one contract story
- [ ] States that exist on the component are shown
- [ ] Spanish user-facing demo copy where applicable
- [ ] Storybook build passes; report whether rendering and interactions were also verified
- [ ] No new secrets, network calls, or platform bindings required to view the story

## Example requests

- “Agrega stories al Input”
- “Documenta el Logo en Storybook”
- “Story para el formulario de login”
- “Actualiza la story del Button porque cambió dense”
