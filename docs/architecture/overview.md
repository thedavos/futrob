# Arquitectura canónica de Futrob

Estado: canónica para el MVP  
Fecha: 2026-07-23  
Plataforma web Must: Cloudflare Workers + D1 + R2 + Queues + Cron Triggers  
Lógica de negocio: packages `@futrob/<bc>` (compartida con futura `apps/api`)

## Propósito

Futrob opera competiciones EA SPORTS FC (MVP: FC Clubs) con separación estricta entre:

| Capa           | Responsabilidad                                                                    |
| -------------- | ---------------------------------------------------------------------------------- |
| **scheduling** | Qué debía jugarse y cuándo (jornadas, enfrentamientos, slots, reprogramaciones)    |
| **game-data**  | Lo que fuentes externas dicen que ocurrió (EA Clubs hoy; manual/OCR/otros después) |
| **results**    | Qué registros cuentan oficialmente (candidatos, selección, confirmación, disputas) |
| **statistics** | Consecuencias competitivas (tabla, rankings, stats oficiales)                      |
| **analytics**  | Interpretación premium del rendimiento                                             |

No se agrupa programación, datos de proveedor, selección oficial y stats en un único módulo `matches`.

## Drivers

- TanStack Start + React en `apps/web`, desplegado en **Cloudflare Workers**.
- Hexagonal por bounded context: domain/application en `packages/@futrob/<bc>`; adapters en la app.
- Composition de web solo en `apps/web/src/di/`. Futura `apps/api` tendrá su propio `di/`.
- Better Auth (identidad) + Futrob (autorización/orgs).
- D1 / R2 / Queues / Cron en web. Tenancy scoped en aplicación (sin RLS Postgres).
- shadcn/Base UI, Vite+, Sentry en boundaries.
- `apps/cli` para ejercitar dominio/use cases en local (no es deployable de producto).
- `billing` queda fuera del MVP inicial.

## Forma del sistema

```text
apps/cli/                   # playground local
apps/api/                   # futuro: API de producto (Node)
apps/web/
├── wrangler.jsonc
├── vite.config.ts
└── src/
    ├── di/                     # composition root de web
    ├── bootstrap/
    ├── config/
    ├── context/
    ├── modules/                # adapters + server + presentation (+ facade index)
    ├── routes/
    ├── shared/                 # infra web; domain reexporta shared-kernel
    └── workers/

packages/
├── <bc>/                       # @futrob/<bc> domain + application + ports
├── shared-kernel/
├── api-contracts/ sdk/ ui/ …
```

Cada BC package:

```text
packages/<context>/src/
├── domain/          # entities, VOs, errors, events, ports
├── application/     # use cases
└── index.ts         # API pública del package
```

En `apps/web`, el módulo de app conserva adapters/server/presentation y reexporta el package.

## Flujo de dependencias

```text
Routes / UI
  → module/server (app)
  → @futrob/<bc> application/use-case
  → domain/entities + domain/ports
  → adapters (app)
  → D1 / R2 / Queues / EA HTTP / email / Sentry
```

Asíncrono:

```text
Use case → Domain event → Outbox → Queue worker → Use case de otro módulo
```

Ejemplo:

```text
SelectOfficialMatches
  → OfficialMatchesSelected
  → notifications worker
ConfirmOfficialSelection
  → OfficialResultApproved
  → statistics projection worker
  → RebuildCompetitionStatistics
  → analytics snapshot worker
```

## Composition roots

| Scope            | Archivo                                        | Rol                           |
| ---------------- | ---------------------------------------------- | ----------------------------- |
| Proceso / Worker | `bootstrap/create-app-context.ts`              | env, bindings, factories base |
| Request          | `bootstrap/create-request-context.ts` + `di/*` | sesión, org, módulos          |
| Jobs             | `bootstrap/register-workers.ts` + `workers/*`  | consumers idempotentes        |

Solo `src/di/*.module.ts` instancia adapters y use cases.

## Identidad y tenancy

- Better Auth → sesión.
- `identity` → estado de producto del actor; `apps/api` persiste `actor_onboarding.onboarding_completed`, fecha, versión y camino por `ActorId`.
- `organizations` → organizaciones, membresías mínimas de tenant (`organizer | staff | member`),
  ledger de grants/auditoría e invitaciones organizacionales o de competición.
- `competitions` → competiciones y membresías contextuales de acceso. Una membresía de competición no sustituye `CompetitionEntry` ni `Roster`.
- `teams` → la autoridad `captain | vice_captain | player` se deriva siempre de un `Roster`
  verificable para el Team y la competición solicitados.
- `AuthorizationPort` vive en `shared-kernel`; cada BC publica su catálogo/bundles y `apps/api`
  compone la decisión efectiva. Las rutas solo adaptan HTTP: los casos de uso exigen capacidades.
- Un `Actor` puede tener un perfil personal de jugador y consultar su propia proyección sin pertenecer a una organización.
- La ruta HTTP de onboarding orquesta APIs públicas de `organizations`, `competitions` y `teams`;
  `identity` solo persiste el estado del recorrido y se completa al final.
- Toda query tenant-scoped filtra por `organizationId` en adapters D1.
- `public-portal` solo lee proyecciones sanitizadas.

## game-data (proveedores)

`game-data` es el único módulo que conoce adapters de fuentes externas. EA Clubs es un adapter bajo `adapters/providers/ea-clubs/`. El dominio usa modelos neutrales (`ProviderMatch`, `ExternalClub`, `RawProviderObservation`) e identidad `UNIQUE(provider_key, external_id)`.

Proveedores MVP: `ea-clubs`, `manual`. Extensiones futuras (`screenshot-ocr`, comunitarios) no cambian `results` / `statistics` / `scheduling`.

## Propiedad de datos

| Módulo        | Posee                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| identity      | users/sessions/accounts (vía Better Auth + mapping Actor)                                                           |
| organizations | organizations, normalized names, tenant memberships, grants, platform roles, authorization audit, invitation tokens |
| competitions  | competitions, rules, stages, entries, competition memberships                                                       |
| teams         | teams, player profiles, player game accounts, rosters, external club connections                                    |
| scheduling    | rounds, encounters, official slots, reschedules                                                                     |
| game-data     | raw observations, provider matches/clubs, sync jobs, health                                                         |
| results       | candidates, selections, confirmations, disputes, official results                                                   |
| statistics    | standings, official player/team stats, personal player projections, rankings                                        |
| analytics     | premium snapshots                                                                                                   |
| notifications | notification intents/deliveries                                                                                     |
| public-portal | read models publicados (o proyecciones propias)                                                                     |

Un módulo no escribe tablas ajenas; publica eventos / usa ports de lectura.

## Decisiones relacionadas

- [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md)
- [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md)
- [ADR-0003](/docs/adr/0003-better-auth-and-d1-ownership.md)
- [ADR-0004](/docs/adr/0004-multi-tenant-d1-scoping.md)
- [ADR-0005](/docs/adr/0005-typed-private-api.md)
- [ADR-0006](/docs/adr/0006-game-data-provider-port.md)
- [ADR-0007](/docs/adr/0007-immutable-provider-observations.md)
- [ADR-0008](/docs/adr/0008-notifications-web-and-email.md)
- [ADR-0009](/docs/adr/0009-cloudflare-workers-topology.md)
- [ADR-0010](/docs/adr/0010-bounded-context-packages.md)
- [ADR-0011](/docs/adr/0011-tagged-errors.md)
- [ADR-0012](/docs/adr/0012-tanstack-query-client-server-state.md)
- [module-boundaries.md](/docs/architecture/module-boundaries.md)
- [dependency-graph.md](/docs/architecture/dependency-graph.md)

Producto: [product/prd.md](/product/prd.md) · [domain-glossary.md](/product/domain-glossary.md)

Monorepo packages/SDK (propuesta): [packages-and-sdk.md](/docs/architecture/packages-and-sdk.md)
