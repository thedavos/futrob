# Límites de módulos

Estado: canónico  
Relacionado: [overview](/docs/architecture/overview.md) · [dependency-graph](/docs/architecture/dependency-graph.md)

## Bounded contexts (MVP)

| Módulo          | Responsabilidad                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `identity`      | Usuarios, sesiones, autenticación y estado de onboarding del actor                                     |
| `organizations` | Organizaciones, membresías de tenant, grants/auditoría y tokens de invitación                          |
| `competitions`  | Ligas/copas, formatos, etapas, reglas, edición FC y membresías contextuales de competición             |
| `teams`         | Equipos, perfiles de jugador, cuentas de juego, plantillas, capitanes y asociaciones a clubes externos |
| `scheduling`    | Jornadas, rondas, enfrentamientos, slots oficiales, reprogramaciones                                   |
| `game-data`     | Proveedores externos, sync, payloads crudos, datos normalizados, health                                |
| `results`       | Candidatos, selección oficial, confirmaciones, disputas, resultados oficiales                          |
| `statistics`    | Stats oficiales, proyecciones personales, tablas, rankings, premios                                    |
| `analytics`     | Analíticas premium (equipo, jugador, organizador)                                                      |
| `notifications` | Web, email (WhatsApp/push como ampliación)                                                             |
| `public-portal` | Lecturas públicas sanitizadas                                                                          |

`billing` está fuera del MVP.

## Capas dentro de un BC

| Capa               | Dónde                        | Puede                                        | No puede                                |
| ------------------ | ---------------------------- | -------------------------------------------- | --------------------------------------- |
| `domain`           | `packages/<bc>`              | TS, `@futrob/shared-kernel`, tipos propios   | React, Zod, D1, fetch, Wrangler, Sentry |
| `application`      | `packages/<bc>`              | domain + ports                               | adapters concretos, routes, UI          |
| `adapters`         | `apps/api` o app propietaria | application/domain vía package, infra de app | UI de otro módulo; internals ajenos     |
| `server`           | app                          | use cases vía DI; Zod input                  | reglas de dominio                       |
| `presentation`     | app                          | view models / server fns públicas            | repositories concretos                  |
| package `index.ts` | `packages/<bc>`              | use cases, types, ports                      | adapters, schemas DB, mappers           |

## Separación crítica

```text
scheduling   → cuándo / cuántos partidos
game-data    → qué dicen las fuentes externas
results      → qué cuenta oficialmente
statistics   → consecuencias competitivas
analytics    → interpretación premium
```

## Cross-module permitido

```text
results application
  → ProviderMatchReaderPort
  → GameDataMatchReaderAdapter (bridge)
  → game-data public application API

statistics worker
  → OfficialResultReaderPort
  → ResultsOfficialResultReaderAdapter
  → results public API

scheduling
  → CompetitionScheduleRulesReaderPort
  → competitions public API

onboarding HTTP orchestration
  → organizations / competitions / teams public application APIs
  → identity completeOnboarding last

private use case
  → AuthorizationPort (shared-kernel)
  → contextual resolver (apps/api composition)
  → role membership + owning BC permission catalog + scoped grant ledger
```

El path personal usa el paso `club` para crear una `PlayerExternalClubAssociation` en `teams`.
Esta operación no crea un `Team` ni un `Roster`. `ExternalClubConnection` conserva la asociación
operativa de un Team. El adapter de persistencia de `identity` normaliza el valor legacy `team` al
leer progreso de onboarding; el dominio y las respuestas nuevas solo usan `club`.

Una invitación usada por onboarding siempre referencia una competición. `organizations` valida y
consume el token y asegura una membresía `member` mínima del tenant; `competitions` persiste después
`staff | captain | player` exclusivamente en la competición. Ninguna operación eleva ese rol a la
organización ni crea una `CompetitionEntry` o un `Roster`.

Los catálogos de permisos y bundles permanecen en `organizations`, `competitions`, `teams`,
`scheduling` y `results`. El resolver valida la cadena organización → competición → Team → Encounter;
un `deny` vence dentro del mismo scope y una decisión más específica vence a la heredada.

En presentation (`apps/web`), gatear UI solo con el set `allowed` de EffectiveAccess vía
`can` / `useCan` / `useCapabilities` y las constantes exportadas por cada BC. No comparar roles
en React ni inventar strings de permiso fuera del catálogo del BC.

En `apps/mobile`, aplicar la misma regla sobre `EffectiveAccess` desde hooks/estado nativos. La app
no importa bounded contexts ni adapters: consume contratos mediante `@futrob/sdk` y deja la
autorización definitiva a `apps/api`.

## Cross-module prohibido

```text
results → game-data/adapters/providers/ea-clubs/*
statistics → results/adapters/persistence/schemas
teams → identity DB tables
routes → getDb() / env.APP_DB
routes → role string comparisons
presentation → repository concrete
presentation → role string comparisons / permission string literals
```

## Eventos versionados (contratos)

Publicados vía outbox; consumers idempotentes.

```text
organizations.member-role-changed
competitions.competition-created
competitions.competition-started
teams.external-club-connected
teams.roster-locked
scheduling.encounter-created
scheduling.reschedule-requested
scheduling.encounter-rescheduled
scheduling.encounter-ready-for-sync
game-data.provider-matches-synced
game-data.provider-match-discovered
results.official-matches-selected
results.official-selection-confirmed
results.match-dispute-opened
results.official-result-approved
statistics.competition-stats-rebuilt
statistics.rankings-updated
analytics.snapshot-generated
```

## Nomenclatura

| Dominio                                                         | Ports                  | Use cases                      | Adapters                               |
| --------------------------------------------------------------- | ---------------------- | ------------------------------ | -------------------------------------- |
| `Encounter`, `ProviderMatch`, `OfficialMatchSelection`          | `*Repository`, `*Port` | `SelectOfficialMatchesUseCase` | `D1*Adapter`, `EaClubsGameDataAdapter` |
| Específicos EA solo en `game-data/adapters/providers/ea-clubs/` |                        |                                |                                        |

## Persistencia

Los adapters de persistencia de producto viven en `apps/api` y usan Postgres o stores in-memory de desarrollo. `apps/auth` es dueño de D1 para identidad; `apps/web` conserva infraestructura BFF/Workers y `apps/mobile` no accede directamente a ninguna persistencia. Cambiar de plataforma no mueve el dominio fuera de packages.
