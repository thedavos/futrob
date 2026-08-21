# ADR-0013: Egress a EA solo desde la API de producto

- Estado: Aceptada
- Fecha: 2026-08-21
- Relacionado: [ADR-0006](/docs/adr/0006-game-data-provider-port.md) · [ADR-0009](/docs/adr/0009-cloudflare-workers-topology.md) · [ADR-0010](/docs/adr/0010-bounded-context-packages.md)

## Contexto

El egress al proveedor EA (EA Clubs) existía duplicado en dos adaptadores paralelos:

- `apps/web/src/modules/game-data/adapters/providers/ea-clubs/` (Workers, BFF)
- `apps/api/src/adapters/game-data/ea-clubs/` (Node en Railway)

Las versiones ya habían divergido: el lado api sumó circuit breaker, health port, correlation logging, ingestion port y retries; el lado web quedó congelado. Los mappers/schemas se habían deduplicado en `packages/ea-clubs`, pero quedaban shims `@deprecated` re-exportando en ambas apps.

Una auditoría de consumo demostró que el adaptador de web era **código muerto**: ninguna ruta BFF ni server function invocaba `modules.gameData`; todo el tráfico real iba browser → BFF (`/api/v1/game-data/*`) → SDK → `apps/api`. La cadena DI `create-modules` → `create-request-context` → `create-api-request-context` no tenía consumidores.

## Decisión

1. **`apps/api` es el único dueño del egress a EA.** El `EaClubsGameDataAdapter`, su HTTP client y los adapters de resiliencia viven solo en `apps/api/src/adapters/game-data/ea-clubs/`.
2. **La lógica pura del proveedor vive en `@futrob/ea-clubs`** (schemas Zod, mappers, crest URL) con sus tests y fixtures dentro del package.
3. **Se eliminó el adaptador y la cadena DI muerta de web** (`game-data.module`, `create-modules`, `create-request-context`, `create-app-context`, `create-api-request-context`, `runtime-config`, `feature-flags`) junto con los shims `@deprecated` de ambas apps.
4. El BFF de web sigue expuesto como proxy autenticado hacia la API; no habla con EA directamente.

## Consecuencias

- Una sola implementación que evolucionar (resiliencia, versiones de esquema EA, observabilidad).
- `packages/ea-clubs` es testeable sin adapters ni red; `vp test` lo incluye como proyecto.
- El web Worker ya no necesita `EA_CLUBS_BASE_URL` para egress propio (la variable permanece solo como configuración del cliente SDK hacia la API).
- Si en el futuro un flujo de web necesitara egress directo (p. ej. latencia), se reintroduciría vía puerto en `@futrob/game-data`, no copiando adapters.

## Alternativas rechazadas

- Mantener ambos adaptadores sincronizados (drift comprobado; costo doble de mantenimiento).
- Mover el HTTP client base a `@futrob/ea-clubs`: acoplaría el package a runtime/fetch específico; la resiliencia (circuit breaker, cache) es política del adapter en api.
