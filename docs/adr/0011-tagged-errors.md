# ADR-0011: TaggedError para fallos esperados tipados

- Estado: Aceptada
- Fecha: 2026-08-03
- Actualizada: 2026-08-03
- Relacionado: [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md) · [ADR-0010](/docs/adr/0010-bounded-context-packages.md) · [ADR-0012](/docs/adr/0012-tanstack-query-client-server-state.md) · better-result

## Contexto

Los fallos esperados tipados necesitan discriminación en TypeScript (uniones por use case), wire HTTP estable (`code` / `messageKey`) y props tipadas en lugar de `details?: Record<string, unknown>`. `better-result` provee `Result` y `TaggedError` desde `@futrob/shared-kernel`.

## Decisión

1. Fallos esperados de dominio, application o adapter se definen como `TaggedError` en el BC o adapter dueño (`packages/<bc>/src/domain/errors/` para vocabulario del BC).
2. Cada TaggedError de producto lleva un `code` string estable (`"<bc>.<snake_case>"`) para wire HTTP / `messageKey: errors.${code}` / i18n.
3. Las props tipadas sustituyen bags genéricos de `details`.
4. El match exhaustivo (`.match` / `matchError`) ocurre en boundaries (HTTP, CLI, presentation), no esparcido en dominio.
5. **`Panic`** es solo para defectos (invariantes rotas, callbacks de combinators que tiran). No se envuelve en `Result.err`.
6. **Fuera de TaggedError:** validación Zod / `api.validation_error`, auth e infra de composition, DTOs de transporte.
7. El helper legacy `DomainError` / `domainError()` fue retirado de `@futrob/shared-kernel` tras migrar results, organizations, game-data, teams y competitions.

## Consecuencias

- Uniones de error por use case / BC permiten exhaustividad en TypeScript.
- Boundaries HTTP mapean fallos vía `failureToHttp` (`HttpMappableFailure` con `code` estable); el objetivo a medio plazo es match por `_tag` en lugar de heurísticas sobre `code`.

## Alternativas rechazadas

- Un único `TaggedError("DomainError")` con `code` string (no gana exhaustividad).
- Big Bang de todos los códigos en una sola PR (se migró por familia).
- Usar Panic para validación de negocio.
