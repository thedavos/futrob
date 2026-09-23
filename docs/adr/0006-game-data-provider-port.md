# ADR-0006: Puerto genérico de game-data (EA como adapter)

- Estado: Aceptada
- Fecha: 2026-07-17
- Actualizada: 2026-09-22
- Reemplaza: ADR de “EA Clubs port” acoplado al nombre EA en el bounded context

## Contexto

El MVP obtiene datos de `proclubs.ea.com/api`, pero Futrob debe poder añadir manual, OCR u otros proveedores sin reescribir results/statistics/scheduling.

## Decisión

- Bounded context: **`game-data`** (no `ea-data` ni `provider`).
- Dominio neutral: `ProviderMatch`, `ExternalClub`, `RawProviderObservation`, `GameDataProviderPort`, `GameDataProviderRegistryPort`.
- Identidad externa: `UNIQUE(provider_key, external_id)`.
- EA Clubs vive en `apps/api/src/adapters/game-data/ea-clubs/`; schemas y mappers puros en `@futrob/ea-clubs`. Ver [ADR-0013](/docs/adr/0013-ea-egress-api-only.md).
- Sync vía Cloudflare Queues + Cron; idempotente; nunca oficializa resultados.

## Consecuencias

- `results` lee candidatos vía `ProviderMatchReaderPort`.
- Agregar un proveedor = nuevo adapter + registro en DI.
- Coste de normalización y reconciliación multi-fuente a futuro.

## Alternativas rechazadas

- Nombrar el contexto `ea-data` o `provider`.
- Llamar EA desde results o React.
- `eaMatchId` global sin `provider_key`.

## Estado de implementación y evidencia

El port neutral y los adapters de API existen; agregar un proveedor requiere su propia
implementación y validación, no solo registrarlo. OCR no es fuente primaria del MVP.
La orquestación de sync se define en [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md)
y el almacenamiento raw en [ADR-0007](/docs/adr/0007-immutable-provider-observations.md).
