# ADR-0010: Packages por bounded context y apps/api futura

- Estado: Reemplazada
- Reemplazada el: 2026-09-22
- Reemplazada por: [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

Este ADR se conserva para mantener la historia y los enlaces existentes. Su contenido
original no prescribe la implementación actual; consultar la decisión sucesora.

## Registro histórico

- Estado original: Aceptada
- Fecha: 2026-07-23
- Relacionado: [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md) · [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md) · [packages-and-sdk](/docs/architecture/packages-and-sdk.md)

## Vigencia de la topología

La ubicación de adapters y persistencia descrita abajo refleja la decisión original. Para implementar cambios, rige la [arquitectura actual](/docs/architecture/overview.md): dominio/application en `packages/<bc>`, composición y Postgres de producto en `apps/api`, egress EA exclusivo de esa API ([ADR-0013](/docs/adr/0013-ea-egress-api-only.md)), auth/actores y migraciones D1 en `apps/auth` ([ADR-0015](/docs/adr/0015-auth-extraction.md)). Se mantienen las reglas de separación de dominio y autorización con scoping de organización.

## Contexto

El CLI ya consumía dominio vía path alias a `apps/web`. Una API de producto (`apps/api`) necesitará los mismos use cases in-process (p. ej. runtime Node para egress a proveedores). Duplicar dominio o acoplar `apps/api` al árbol de web no es aceptable.

## Decisión

1. Cada bounded context MVP tiene un package `@futrob/<bc>` con **solo** `domain` + `application` (+ ports bajo `domain/ports`).
2. Packages actuales: `identity`, `organizations`, `competitions`, `teams`, `scheduling`, `game-data`, `results`, `statistics`, `analytics`, `notifications`, `public-portal`.
3. Dependencias cross-BC entre packages están permitidas solo vía API pública del package (p. ej. `@futrob/results` → `@futrob/game-data`).
4. Adapters, HTTP handlers, UI y Wrangler bindings **no** viven en esos packages.
5. `apps/web` (hoy) y `apps/api` (futuro) dependen de `@futrob/<bc>` y componen adapters en su `di/`.
6. `@futrob/shared-kernel` concentra primitivas de dominio compartidas (Result, TaggedError, brands, DomainEvent, EventPublisherPort). Fallos esperados: ver [ADR-0011](/docs/adr/0011-tagged-errors.md).
7. Facades `apps/web/src/modules/<bc>/index.ts` pueden reexportar `@futrob/<bc>` durante la transición.

## Consecuencias

- Segundo deployable puede nacer sin mover de nuevo el dominio.
- EA y D1 siguen en adapters de app (hoy `apps/web`).
- Hay que mantener `exports` públicos del package disciplinados (`index.ts`).

## Alternativas rechazadas

- Path alias permanente `apps/api` → `apps/web/src/modules`.
- Un mega-package `@futrob/modules`.
- Mover adapters EA/D1 a packages.
