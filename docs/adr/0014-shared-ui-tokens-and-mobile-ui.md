# ADR-0014: Tokens de diseño compartidos y UI nativa en móvil

- Estado: Aceptada
- Fecha: 2026-08-22
- Relacionado: [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md) · [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md) · [`product/design-system-spec.md`](/product/design-system-spec.md) · [`packages/ui-tokens`](/packages/ui-tokens/README.md)

## Contexto

El cliente móvil (`apps/mobile`, React Native + Expo) sale junto a web y API. La lógica de
negocio ya es compartible vía `@futrob/<bc>` + `@futrob/sdk`, pero la identidad visual vivía
solo en `packages/ui` (Tailwind CSS 4 + Base UI sobre DOM), que no ejecuta en React Native:

- Base UI renderiza elementos del navegador; RN no tiene DOM.
- Tailwind y `tokens.css` son CSS; RN no interpreta `oklch()` ni custom properties.
- Phosphor, formularios y overlays tienen APIs distintas por plataforma.

## Decisión

1. **`@futrob/ui-tokens` es la fuente única de los design tokens** (rampas OKLCH, tipografía,
   geometría, motion, temas semánticos light/dark) como datos TypeScript.
2. **`packages/ui/src/tokens.css` pasa a ser un artefacto generado**
   (`npm run generate:css -w @futrob/ui-tokens`). Un test de paridad y un modo `--check`
   para CI impiden que el artefacto y los datos diverjan.
3. **Móvil resuelve tokens a primitivas nativas**: colores OKLCH → sRGB hex al cargar,
   unidades rem → dp con equivalencia fija `1rem = 16`. Las primitivas viven en
   `apps/mobile/src/ui/` espejando el _contrato_ de variantes cerradas de web, no su
   implementación.
4. **No hay capa de wrappers multiplataforma**: cada plataforma consume su render tree;
   lo compartido son tokens, vocabulario de roles (`typo-*`) y reglas del design system.

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
- Nuevas primitivas requieren doble implementación (web en `packages/ui`, móvil en
  `apps/mobile/src/ui`) respetando las mismas variantes cerradas y roles.
- El catálogo de iconos móvil queda pendiente (Phosphor tiene build RN); el MVP móvil no usa
  iconografía decorativa.
- `/api/v1` acepta `Authorization: Bearer <token>` de sesión (plugin `bearer()` de Better
  Auth en `apps/web`): el flujo post-auth móvil consume el SDK con el token guardado en
  SecureStore; auth usa Better Auth directo.
