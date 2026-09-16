# ADR-0006: Puerto genérico de game-data (EA como adapter)

- Estado: Aceptada
- Fecha: 2026-07-17
- Reemplaza: ADR de “EA Clubs port” acoplado al nombre EA en el bounded context

## Vigencia de la topología

La ubicación de adapters y persistencia descrita abajo refleja la decisión original. Para implementar cambios, rige la [arquitectura actual](/docs/architecture/overview.md): dominio/application en `packages/<bc>`, composición y Postgres de producto en `apps/api`, egress EA exclusivo de esa API ([ADR-0013](/docs/adr/0013-ea-egress-api-only.md)), auth/actores y migraciones D1 en `apps/auth` ([ADR-0015](/docs/adr/0015-auth-extraction.md)). Se mantienen las reglas de separación de dominio y autorización con scoping de organización.

## Contexto

El MVP obtiene datos de `proclubs.ea.com/api`, pero Futrob debe poder añadir manual, OCR u otros proveedores sin reescribir results/statistics/scheduling.

## Decisión

- Bounded context: **`game-data`** (no `ea-data` ni `provider`).
- Dominio neutral: `ProviderMatch`, `ExternalClub`, `RawProviderObservation`, `GameDataProviderPort`, `GameDataProviderRegistryPort`.
- Identidad externa: `UNIQUE(provider_key, external_id)`.
- EA Clubs vive solo en `adapters/providers/ea-clubs/`.
- Sync vía Cloudflare Queues + Cron; idempotente; nunca oficializa resultados.

## Consecuencias

- `results` lee candidatos vía `ProviderMatchReaderPort`.
- Agregar un proveedor = nuevo adapter + registro en DI.
- Coste de normalización y reconciliación multi-fuente a futuro.

## Alternativas rechazadas

- Nombrar el contexto `ea-data` o `provider`.
- Llamar EA desde results o React.
- `eaMatchId` global sin `provider_key`.
