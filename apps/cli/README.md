# `@futrob/cli`

CLI local para **probar dominio, use cases y la API** mientras construyes Futrob. No es un deployable de producto (eso sigue siendo `apps/web`).

## Para qué sirve

- Ejercitar entidades, value objects y reglas puras sin UI ni Workers.
- Correr use cases con **fakes en memoria** (ports) antes de tener D1/R2.
- Smoke rápido de flujos (encuentro → candidatos EA → selección oficial) desde la terminal.
- Ejercitar **toda la superficie HTTP de `apps/api`** vía `@futrob/sdk` con service auth.
- `e2e-golden-path`: flujo completo org → competición → entry → publish → fixture en un solo comando.

## Qué no es

- No sustituye Vitest (los tests siguen en el módulo / `packages/test-support`).
- No es API pública ni herramienta de ops en producción.
- No importa adapters de Cloudflare (D1, Queues, EA HTTP real) salvo comandos explícitos de integración vía `@futrob/sdk`.
- No mueve el dominio: ya vive en `@futrob/<bc>`; el CLI solo lo consume.

## Effect TS

El CLI usa [`effect`](https://effect.website) como runtime de errores tipados:

- `src/lib/errors.ts` — `Data.TaggedError`: `ApiError` (HTTP 4xx/5xx del API), `NetworkError` (fetch falló), `UsageError` (argumentos inválidos). Canal de error unificado `CliError`.
- `src/lib/call-api.ts` — `callApi()` eleva promesas del SDK a `Effect<A, ApiError | NetworkError>`.
- `src/lib/run-program.ts` — `runProgram()` corre el programa (`Effect.runPromiseExit`), imprime la falla según su tag y mapea a exit code.
- Los comandos devuelven `Effect.Effect<number, CliError>`; los smokes de dominio envuelven lógica async en `Effect.promise`.

## Auth (service auth)

Todos los endpoints de `apps/api` (salvo meta/openapi) exigen service auth:
`Authorization: Bearer <INTERNAL_JOB_SECRET>` + `X-Futrob-Actor-Id`.

| Variable / flag                          | Uso                                               |
| ---------------------------------------- | ------------------------------------------------- |
| `FUTROB_INTERNAL_JOB_SECRET`             | Bearer token (debe coincidir con `apps/api/.env`) |
| `--actor <id>` o `FUTROB_ACTOR_ID`       | Identidad del actor para permisos/RBAC            |
| `FUTROB_ACCESS_TOKEN`                    | Override opcional del bearer                      |
| `--base-url URL` o `FUTROB_API_BASE_URL` | Default `http://localhost:8787/api/v1`            |

Sin `--actor` los endpoints protegidos responderán 401.

## Uso

Desde la raíz del monorepo:

```bash
npm install
npm run cli -- help
npm run cli -- ping

# Smokes offline (sin API):
npm run cli -- domain-smoke
npm run cli -- domain-smoke-game-data
npm run cli -- statistics-smoke
npm run cli -- results-smoke

# Integración (apps/api en marcha):
npm run dev
npm run cli -- api-health --actor actor_demo
npm run cli -- club-search Fera --actor actor_demo --json
npm run cli -- e2e-golden-path --actor actor_demo
```

## Comandos

### Base y dominio (offline)

| Comando                  | Descripción                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `help`                   | Lista comandos                                                           |
| `ping`                   | Comprueba que el CLI arranca                                             |
| `domain-smoke`           | Smoke de shared-kernel + tipos de scheduling/results                     |
| `domain-smoke-game-data` | Helpers puros + `SearchExternalClubsUseCase` con provider fake           |
| `statistics-smoke`       | `GetMyPersonalStatisticsUseCase` con fakes en memoria                    |
| `results-smoke`          | `SelectOfficialMatches` → `ConfirmOfficialSelection` con fakes + eventos |

### Integración (requieren `npm run dev`)

| Comando                                                   | Descripción                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------------- |
| `api-health`                                              | `GET /meta/ping`                                                            |
| `org-name-check <name>`                                   | Disponibilidad de nombre de organización                                    |
| `org-create <name>`                                       | Crea organización                                                           |
| `org-mine`                                                | Membresías del actor                                                        |
| `org-invite <orgId> <email> [--role role]`                | Invitación staff de organización                                            |
| `onboarding-status`                                       | Estado de onboarding del actor                                              |
| `comp-create <orgId> <name>`                              | Draft de competición (`--edition --platform --region --tz --format`)        |
| `comp-list <orgId>` / `comp-show <orgId> <compId>`        | Listar / ver draft                                                          |
| `comp-publish <orgId> <compId>`                           | Publica la competición                                                      |
| `participant-add/list`                                    | Participantes de competición                                                |
| `entry-register/approve/reject`                           | Ciclo de entries de equipos                                                 |
| `standings <orgId> <compId>`                              | Tabla de posiciones                                                         |
| `team-create/team-list`                                   | Equipos de la organización                                                  |
| `roster-list/add/close/open`                              | Roster por competición                                                      |
| `club-link <orgId> <compId> <teamId> <clubId> <clubName>` | Vincula club EA al equipo                                                   |
| `fixture-generate/show`                                   | Genera y consulta el fixture                                                |
| `snapshot-set <encounterId ...>`                          | Upsert de schedule snapshot                                                 |
| `club-search/get/matches`                                 | Clubes EA vía game-data                                                     |
| `sync-job-enqueue/run/run-next`                           | Jobs de sincronización EA (endpoints internos)                              |
| `provider-health [providerKey]`                           | Salud del proveedor (circuit breaker)                                       |
| `player-me`, `my-stats`, `my-matches`                     | Perfil y estadísticas personales                                            |
| `e2e-golden-path`                                         | Flujo completo: ping → org → draft → team ×2 → entry ×2 → publish → fixture |

Flags comunes en integración: `--json`, `--base-url URL`, `--actor ID`.

## Añadir un comando de dominio

1. Crea `src/commands/<nombre>.ts` que exporte `run(...): Effect.Effect<number, CliError>`.
2. Regístralo en `src/main.ts`.
3. Importa `@futrob/<bc>` (+ fakes). Evita adapters de web.
4. Usa `@futrob/test-support` para builders compartidos cuando existan.
5. Documenta el comando en esta tabla y en `help.ts`.

## Añadir un comando de integración (API)

1. Usa `@futrob/sdk` vía `apiCall(config, (client) => ...)`.
2. Parsea flags comunes con `parseCommon(raw)` y valida argumentos con `requirePositionals`.
3. Documenta que requiere `npm run dev` + service auth.

Ejemplo:

```ts
export function run(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const config = { baseUrl: common.baseUrl, actorId: common.actorId };
    const result = yield* apiCall(config, (client) => client.meta.ping());
    printJson(result);
    return 0;
  });
}
```

## Layout

```text
apps/cli/
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts                # dispatcher → runProgram
    ├── commands/
    │   ├── help.ts            # texto de ayuda centralizado
    │   ├── ping.ts / domain-smoke.ts
    │   ├── domain-smoke-game-data.ts
    │   ├── statistics-smoke.ts
    │   ├── results-smoke.ts
    │   ├── api-health.ts / onboarding.ts
    │   ├── organizations.ts / competitions.ts / teams.ts
    │   ├── scheduling.ts / game-data.ts / players.ts
    │   ├── search-clubs.ts
    │   └── e2e-golden-path.ts
    └── lib/
        ├── errors.ts          # ApiError | NetworkError | UsageError (Effect Data.TaggedError)
        ├── call-api.ts        # promise → Effect
        ├── run-program.ts     # runner con impresión tipada de fallas
        ├── args.ts / parse-flags.ts / print.ts
        └── futrob-client.ts   # cliente SDK + service auth + apiCall()
```

## Vite+ / quality tooling

`apps/cli` **does not** install `vite-plus` or run as a Vite app. It stays on `tsx` + TypeScript.

Fmt / lint / `vp check` for CLI sources come from the **repo-root** `vite.config.ts` (Node override with `no-console` off). Use:

```bash
vp fmt
vp lint
vp check
```

## Typecheck

```bash
npm run typecheck -w @futrob/cli
# or from root:
npm run typecheck
```
