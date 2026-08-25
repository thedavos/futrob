---
name: futrob-stylex
description: Author and migrate Futrob web styles with StyleX. Use when adding or changing UI in packages/ui or apps/web presentation.
---

# Futrob StyleX

Web styling is **StyleX** (`@stylexjs/stylex`). Do not add Tailwind classes, `cn()`, CVA, or `tailwind-merge`.

Mobile (`apps/mobile`) stays on React Native `StyleSheet` + `@futrob/ui-tokens`. Do not introduce StyleX there.

## Compiler

`@stylexjs/unplugin` is wired in `apps/web/vite.config.ts` and `.storybook/main.ts` via `tools/stylex/vite-plugin.ts`. StyleX must run **before** the React plugin.

`stylex.create` / `defineVars` / `defineConsts` are compile-time. Values inside `create` must be literals or StyleX variables — no runtime strings.

## Tokens

- Semantic CSS variables in `packages/ui/src/tokens.css` remain the source of truth (generated from `@futrob/ui-tokens`).
- Dark theme still flips those variables via `.dark` / `[data-theme="dark"]`. Do not use `prefers-color-scheme` to enable dark.
- Consume colors through `colors` from `@futrob/ui/styles/tokens.stylex` (StyleX cannot follow a barrel for `defineVars`).
- Breakpoints: `media` from `@futrob/ui/styles/media.stylex` (`sm` 40rem, `md` 48rem, `lg` 64rem, `maxSm` for touch density).
- Type roles: `typography.display|heading|subtitle|label|body|caption|score`.
- Elevation: `elevation.sm|md|lg` (former `smooth-shadow-ring-*`). Never pair with `border` / `ring` on the same element.

`.stylex.ts` files may only export `defineVars` / `defineConsts` named exports.

## Authoring rules

1. One `stylex.create` per file (or colocated `*.styles.ts` if the file would exceed 400 lines).
2. Descriptive keys (`base`, `dense`, `title`) — not `$1`.
3. camelCase properties. Split multi-value shorthands (`borderWidth` + `borderStyle` + `borderColor`). Single-value `padding: 16` is fine.
4. Numbers are px. Other units are strings (`"1.5rem"`, `"50%"`).
5. Conditions live **inside** the property. `default` is required whenever any condition exists (`null` if there is no base).

```ts
opacity: { default: 1, ":hover": 0.8, ":disabled": 0.5 },
display: { default: "block", [media.sm]: "flex" },
```

6. Apply on **host elements** with `applyHost(className, style, styles.base, cond && styles.active)` from `@futrob/ui`. Last wins.
7. Do not spread `stylex.props` onto capitalized components. Pass `className` / `style` (or a StyleX token the component applies on its host).
8. `space-y-*` / `divide-*` → `display: "flex"` + `gap` on the parent.
9. `group` / `peer` → `stylex.when.ancestor` / `stylex.when.siblingBefore` + `stylex.defaultMarker()`, or a `data-slot` rule in `packages/ui/src/slots.css`.
10. Do not invent a utility-class layer. Colocate semantic styles with the component.

## Public UI API

Primitives keep React `className` + `style` so Base UI `render` still works. New overrides should be StyleX tokens composed by the primitive, not Tailwind strings.

Closed variants stay as typed unions + StyleX maps. Do not reintroduce CVA.

## Global CSS that stays

`packages/ui/src/styles.css` — reset, Manrope, selection, focus outline.
`packages/ui/src/elevation.css` — shadow + hairline ring variables.
`packages/ui/src/slots.css` — only selectors StyleX cannot express (descendants, table density, Base UI enter/exit).

## Checklist

- Import `applyHost`, `typography`, and `elevation` from `@futrob/ui`. Import `colors` from `@futrob/ui/styles/tokens.stylex` and `media` from `@futrob/ui/styles/media.stylex`.
- Resolve each former Tailwind class to the CSS it produced, then reshape — do not guess.
- Flag anything that needed `slots.css` or markup restructuring.
