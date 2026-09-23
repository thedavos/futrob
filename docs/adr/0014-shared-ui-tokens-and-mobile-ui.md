# ADR-0014: Tokens de diseño compartidos y UI nativa en móvil

- Estado: Aceptada
- Fecha: 2026-08-22
- Actualizada: 2026-09-22
- Relacionado: [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md) · [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md) · [`design.md`](/design.md) · [`packages/ui-tokens`](/packages/ui-tokens/src/index.ts)

## Contexto

El cliente móvil (`apps/mobile`, React Native + Expo) sale junto a web y API. La lógica de
negocio ya es compartible vía `@futrob/<bc>` + `@futrob/sdk`, pero la identidad visual vivía
solo en `packages/ui` (StyleX + Base UI sobre DOM), que no ejecuta en React Native:

- Base UI renderiza elementos del navegador; RN no tiene DOM.
- StyleX y `tokens.css` son CSS; RN no interpreta `oklch()` ni custom properties.
- Phosphor, formularios y overlays tienen APIs distintas por plataforma.

## Decisión

1. **`@futrob/ui-tokens` es la fuente única de los design tokens** (rampas OKLCH, tipografía,
   geometría, motion y tema semántico) como datos TypeScript.
2. **`packages/ui/src/tokens.css` pasa a ser un artefacto generado**
   (`npm run generate:css -w @futrob/ui-tokens`). Un test de paridad y un modo `--check`
   para CI impiden que el artefacto y los datos diverjan.
3. **Móvil resuelve tokens a primitivas nativas**: colores OKLCH → sRGB hex al cargar,
   unidades rem → dp con equivalencia fija `1rem = 16`. Las primitivas viven en
   `apps/mobile/src/ui/` espejando el _contrato_ de variantes cerradas de web, no su
   implementación.
4. **No hay capa de wrappers multiplataforma**: cada plataforma consume su render tree;
   lo compartido son tokens, vocabulario de roles tipográficos definidos en `design.md` y reglas del design system.

## Alternativas rechazadas

- **Wrappers con extensión por plataforma** (`Button.web.tsx` / `Button.native.tsx` bajo una
  sola API): mantiene dos render trees detrás de un contrato que en la práctica diverge en
  comportamiento (foco, overlays, formularios); costo alto sin eliminar la duplicación real.
- **React Native Web / Expo DOM components**: exigiría migrar `apps/web` fuera de TanStack
  Start + Workers; no vale por un solo cliente adicional.
- **Duplicar tokens por plataforma** (CSS para web, TS para móvil sin sincronización): drift
  garantizado entre plataformas; hoy se evita con generación + tests.

## Consecuencias

- Cambiar un token exige tocar solo `packages/ui-tokens` y regenerar; CI valida el artefacto.
- Las primitivas necesarias en ambas plataformas tienen implementaciones propias,
  con variantes y roles coherentes. Una necesidad exclusiva de web no exige crear un espejo nativo.
- El catálogo de iconos móvil queda pendiente (Phosphor tiene build RN); el MVP móvil no usa
  iconografía decorativa.
- `/api/v1` acepta `Authorization: Bearer <token>` de sesión (plugin `bearer()` de Better
  Auth en `apps/auth`): el flujo post-auth móvil consume el SDK con el token guardado en
  SecureStore; auth usa Better Auth directo.

## Estado de implementación y evidencia

Los aliases `LIGHT_THEME` y `DARK_THEME` resuelven actualmente a `GRAPHITE_LIME_THEME`;
no representan dos paletas diferentes. La elección visual y sus patrones pertenecen
exclusivamente a [design.md](/design.md), no se duplican en este ADR.

[theme-light.ts](/packages/ui-tokens/src/theme-light.ts) y
[theme-dark.ts](/packages/ui-tokens/src/theme-dark.ts) mantienen esa compatibilidad.
La [CI](/.github/workflows/ci.yml) comprueba la paridad del CSS generado. El transporte
y los dos tipos de Bearer se explican en [ADR-0005](/docs/adr/0005-typed-private-api.md);
la autoridad auth en [ADR-0015](/docs/adr/0015-auth-extraction.md).
