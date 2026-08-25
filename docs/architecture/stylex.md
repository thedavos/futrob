# StyleX in Futrob

**Status:** canonical for `packages/ui` and `apps/web` presentation  
**Not used in:** domain/application packages, `apps/api`, `apps/mobile` (RN StyleSheet)

## Why StyleX

Atomic, compile-time CSS with typed tokens. Conditions (hover, dark-capable vars, breakpoints) live on property values instead of scattered utility strings. The design tokens stay in CSS variables so light-default / dark opt-in does not need `createTheme`.

## Setup

| Piece        | Location                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Runtime      | `@stylexjs/stylex`                                                                               |
| Compiler     | `@stylexjs/unplugin` via `tools/stylex/vite-plugin.ts`                                           |
| Web Vite     | `apps/web/vite.config.ts` — StyleX before React / Start                                          |
| Storybook    | `.storybook/main.ts`                                                                             |
| Tokens       | `packages/ui/src/styles/tokens.stylex.ts`, `media.stylex.ts` (import those files, not a barrel)  |
| Roles        | `packages/ui/src/styles/typography.ts`, `elevation.ts`                                           |
| Apply helper | `packages/ui/src/styles/apply.ts` (`applyProps`, `applyStyles`)                                  |
| Document CSS | `packages/ui/src/styles.css` in `@layer reset`; StyleX lists that layer in `useCSSLayers.before` |

Dev HMR uses `virtual:stylex:runtime` from a client module. Production CSS is appended to the existing `styles.css` asset. `tools/stylex/guard-unplugin-css.cjs` keeps Vite from crashing if LightningCSS sees a transient empty selector while `defineConsts` are still resolving ([StyleX #1497](https://github.com/facebook/stylex/issues/1497)).

## Practices

Follow `.cursor/skills/futrob-stylex/SKILL.md`. Summary:

- Colocate `stylex.create` with the component. Do not rebuild a utility library.
- Import `colors` from `@futrob/ui/styles/tokens.stylex` and `media` from `@futrob/ui/styles/media.stylex` inside `stylex.create`. StyleX cannot follow `defineVars` / `defineConsts` through a re-export. The package barrel is for runtime helpers (`applyProps`, `typography`).
- Conditions require `default`. Last `applyProps` / `stylex.props` argument wins.
- Longhand or single-value shorthands only.
- `stylex.when.*` + markers replace `group` / `peer`. Remaining descendant rules live in `slots.css`.
- Elevation is `elevation.sm|md|lg`. Do not combine with border/ring.

## What is not StyleX

- Generated `tokens.css` (OKLCH + semantic theme).
- Reset and document defaults in `styles.css` (`@layer reset`).
- Hairline-ring shadows in `elevation.css`.
- React Native styles in `apps/mobile`.
