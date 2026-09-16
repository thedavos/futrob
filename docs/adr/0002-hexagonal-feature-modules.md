# ADR-0002: Hexágonos por feature module y packages de BC

- Estado: Aceptada
- Fecha: 2026-07-10
- Actualizada: 2026-07-23
- Relacionado: [ADR-0010](/docs/adr/0010-bounded-context-packages.md)

## Vigencia de la topología

La ubicación de adapters y persistencia descrita abajo refleja la decisión original. Para implementar cambios, rige la [arquitectura actual](/docs/architecture/overview.md): dominio/application en `packages/<bc>`, composición y Postgres de producto en `apps/api`, egress EA exclusivo de esa API ([ADR-0013](/docs/adr/0013-ea-egress-api-only.md)), auth/actores y migraciones D1 en `apps/auth` ([ADR-0015](/docs/adr/0015-auth-extraction.md)). Se mantienen las reglas de separación de dominio y autorización con scoping de organización.

## Contexto

Futrob necesita vertical slices independientes y composition roots por deployable, sin mezclar scheduling, game-data, results y statistics. Web y una futura API deben compartir dominio sin acoplarse a adapters de Cloudflare.

## Decisión

Adoptar arquitectura hexagonal **por bounded context**:

```text
packages/<context>/          # @futrob/<context>
├── domain/                  # entities, VOs, errors, events, ports, policies
├── application/             # use cases
└── index.ts                 # API pública del package (sin adapters)

apps/web/src/modules/<context>/
├── adapters/                # D1, R2, Queues, EA HTTP, bridges…
├── server/                  # server functions / mappers HTTP
├── presentation/            # UI del feature
└── index.ts                 # reexporta @futrob/<context> (+ APIs de app si aplica)

apps/web/src/di/             # composition root de web
# apps/api/src/di/           # composition root de api (cuando exista)
```

Kernel compartido: `@futrob/shared-kernel` (Result, TaggedError, IDs, DomainEvent, EventPublisherPort, …). `apps/web/src/shared/` reexporta o añade infra solo de web.

## Consecuencias

- Separación clara de ownership; tests de dominio/application sin I/O en packages.
- Cross-module solo por ports, APIs públicas de package y eventos versionados.
- Más packages y deps workspace; se acepta.

## Alternativas rechazadas

- Un único módulo `matches` que mezcle fixture, EA, selección y stats.
- Packages por capa técnica (`domain/`, `infra/`) sin vertical slice.
- DI/reflectivo global o importar adapters desde routes.
- Dejar domain+application solo bajo `apps/web` cuando hay segundo deployable.
