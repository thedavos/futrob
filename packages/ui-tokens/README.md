# `@futrob/ui-tokens`

Fuente única de verdad de los design tokens de Futrob, compartida por `apps/web`
(vía `packages/ui`) y `apps/mobile`.

## Qué exporta

| Módulo                             | Contenido                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `scales.ts`                        | Rampas crudas OKLCH (brand, neutral, red, amber, blue, violet)            |
| `typography.ts`                    | Escala tipográfica, pesos y roles `typo-*` (`TypoRole`)                   |
| `geometry.ts`                      | Espaciado, rampa de esquinas, alturas de control y anchos de contenido    |
| `motion.ts`                        | Duraciones, easings y capas z                                             |
| `theme-light.ts` / `theme-dark.ts` | Tokens semánticos (`--primary`, `--danger`, …)                            |
| `oklch.ts`                         | `formatOklch()` para CSS y `oklchToHex()` para plataformas sin OKLCH (RN) |

Helpers de resolución: `resolveThemeColor(name, theme)` recorre cadenas
`var(--a → var(--b → oklch))`; `themeToHexColors(theme)` resuelve todo el tema a
hex sRGB para React Native.

## Relación con `packages/ui/src/tokens.css`

`tokens.css` es un **artefacto generado**: este package es la fuente única y el
script `scripts/generate-css.mjs` lo renderiza (incluye banner GENERATED, los
mismos comentarios de sección y las declaraciones byte a byte).

**Flujo de cambio de tokens:**

1. Edita los datos TS en este package (`scales.ts`, `typography.ts`,
   `geometry.ts`, `motion.ts`, `theme-light.ts`, `theme-dark.ts`).
2. Ejecuta `npm run generate:css -w @futrob/ui-tokens`.
3. Commite ambos packages juntos. `npm run generate:css:check -w
@futrob/ui-tokens` falla si el artefacto quedó desactualizado (apto para CI).
4. El test de paridad (`src/tokens-sync.test.ts`) sigue verificando que el CSS
   generado coincide con los datos TS.

## Consumo

- **Web:** importa `@futrob/ui/styles.css` y consume roles con StyleX `typography.*`.
- **Móvil:** importa `themeToHexColors(LIGHT_THEME)` (o tokens sueltos) desde
  `@futrob/ui-tokens` y construye el objeto tema de la app.
