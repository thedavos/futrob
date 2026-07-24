# `@futrob/cli`

CLI local para **probar dominio y use cases** mientras construyes Futrob. No es un deployable de producto (eso sigue siendo `apps/web`).

## Para qué sirve

- Ejercitar entidades, value objects y reglas puras sin UI ni Workers.
- Correr use cases con **fakes en memoria** (ports) antes de tener D1/R2.
- Smoke rápido de flujos (encuentro → candidatos EA → selección oficial) desde la terminal.

## Qué no es

- No sustituye Vitest (los tests siguen en el módulo / `packages/test-support`).
- No es API pública ni herramienta de ops en producción.
- No importa adapters de Cloudflare (D1, Queues, EA HTTP real) salvo comandos explícitos de integración (p. ej. `search-clubs` vía `@futrob/sdk`).
- No mueve el dominio: ya vive en `@futrob/<bc>`; el CLI solo lo consume.

## Cómo corre el dominio

La lógica de negocio está en `packages/@futrob/<bc>`. El CLI importa esos packages (igual que lo hará `apps/api`).

```ts
import type { Encounter } from "@futrob/scheduling";
import { ok } from "@futrob/shared-kernel";
```

Ver `/docs/architecture/packages-and-sdk.md` y [ADR-0010](/docs/adr/0010-bounded-context-packages.md).

## Uso

Desde la raíz del monorepo:

```bash
npm install
npm run cli -- help
npm run cli -- ping
npm run cli -- domain-smoke

# Integración (apps/web debe estar en marcha):
npm run dev
npm run cli -- search-clubs Fera
npm run cli -- search-clubs Fera --json
```

Desde el workspace:

```bash
npm run cli -w @futrob/cli -- help
```

## Comandos

| Comando        | Descripción                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| `help`         | Lista comandos                                                                   |
| `ping`         | Comprueba que el CLI arranca                                                     |
| `domain-smoke` | Smoke del kernel + tipos de dominio de scheduling/results                        |
| `search-clubs` | Integración: busca clubes vía `@futrob/sdk` → `/api/v1` (requiere `npm run dev`) |

## Añadir un comando de dominio

1. Crea `src/commands/<nombre>.ts` que exporte `run(args: string[]): Promise<number>` (exit code).
2. Regístralo en `src/main.ts`.
3. Importa `@futrob/<bc>` (+ fakes). Evita adapters de web.
4. Usa `@futrob/test-support` para builders compartidos cuando existan.
5. Documenta el comando en esta tabla.

## Añadir un comando de integración (API)

1. Usa `@futrob/sdk` vía `src/lib/futrob-client.ts` (no adapters de web ni EA HTTP).
2. Parsea flags con `src/lib/parse-flags.ts`.
3. Documenta que requiere `npm run dev` (o `FUTROB_API_BASE_URL`).

Ejemplo de composición en el comando:

```ts
// fake ports → use case → print Result
const result = await selectOfficialMatches.execute(command);
if (!result.ok) {
  console.error(result.error);
  return 1;
}
console.log(result.value);
return 0;
```

## Layout

```text
apps/cli/
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts
    ├── commands/
    │   ├── help.ts
    │   ├── ping.ts
    │   ├── domain-smoke.ts
    │   └── search-clubs.ts
    └── lib/
        ├── print.ts
        ├── parse-flags.ts
        └── futrob-client.ts
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
