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
   - `product/design-system-spec.md`, `packages/ui/README.md`, and AGENTS UI contract
   - If the component is in `@futrob/ui`, prefer composing only `@futrob/ui` primitives (no BC packages, no Better Auth, no Wrangler)

## Decide story location and title

| Component location                                                      | Story file                                                                                  | `title` prefix                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `packages/ui/src/components/<name>.tsx` or `packages/ui/src/<name>.tsx` | `packages/ui/src/stories/<name>.stories.tsx`                                                | `Primitives/<Name>` or `Patterns/<Name>` |
| `apps/web/src/modules/<bc>/presentation/<name>.tsx`                     | Colocate: `…/presentation/<name>.stories.tsx` **or** `…/presentation/<feature>.stories.tsx` | `Product/<Area>` (e.g. `Product/Auth`)   |

Rules:

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
- [ ] Light theme default surface (`bg-surface` / Futrob light background). Do not invent dark demos unless the task asks
- [ ] Real Futrob copy in **Spanish** for labels/placeholders (product language); keep English only if the story is explicitly i18n-focused
- [ ] No cards-in-hero / purple gradients / ad-hoc colors — use tokens and `@futrob/ui` only

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

- [ ] Provide Storybook mocks under `.storybook/mocks/` and wire Vite aliases in `.storybook/main.ts` for the exact import paths (including `.ts` suffix when the source imports with extension)
- [ ] Wrap TanStack Router usage in a memory router decorator (see `auth-story-router.tsx` / `auth-forms.stories.tsx`)
- [ ] Never call real Better Auth, D1, EA, or Railway from a story
- [ ] Stub post-success navigation targets so submit flows do not explode

## Implementation steps

1. **Locate** the component and list its exported props / variants from source (do not invent props).
2. **Mirror** an existing story in the same layer (`button.stories.tsx`, `input.stories.tsx`, or `auth-forms.stories.tsx`).
3. **Create or update** the `.stories.tsx` file beside the agreed location.
4. **Import** with the package’s local convention:
   - UI package: relative imports without `.js` extension (Vite + `moduleResolution: Bundler`)
   - Web package: `@/` aliases are fine inside `apps/web` stories
5. **Compose** wrappers with StyleX (`applyHost`, `typography.caption`, `colors.surface`). Prefer flat/line; avoid nested card spam.
6. **Update Storybook** whenever the primitive contract changes (AGENTS / UI contract).
7. **Verify**:
   - `npm run storybook` — story appears under the expected title and renders without console errors
   - Or `npm run storybook:build` if you cannot keep the dev server attached
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
- [ ] Storybook renders the story cleanly (`storybook` or `storybook:build`)
- [ ] No new secrets, network calls, or platform bindings required to view the story

## Example prompts this command should handle

- “Agrega stories al Input”
- “Documenta el Logo en Storybook”
- “Story para el formulario de login”
- “Actualiza la story del Button porque cambió dense”
