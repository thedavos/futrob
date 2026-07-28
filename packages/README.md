# Packages Futrob — guía

Código compartido del monorepo. La **lógica de negocio** (domain + application + ports) vive en `@futrob/<bounded-context>`. Las apps (`web`, futura `api`, `cli`) componen adapters y HTTP encima.

Documento canónico: [`/docs/architecture/packages-and-sdk.md`](/docs/architecture/packages-and-sdk.md) · [ADR-0010](/docs/adr/0010-bounded-context-packages.md).

## Inventario

| Package                                                         | npm / pub               | Rol                                                       |
| --------------------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| [`identity`](./identity/) … [`public-portal`](./public-portal/) | `@futrob/<bc>`          | Domain + application + ports por BC                       |
| [`api-contracts`](./api-contracts/)                             | `@futrob/api-contracts` | Zod / OpenAPI de `/api/v1`                                |
| [`sdk`](./sdk/)                                                 | `@futrob/sdk`           | Cliente HTTP TypeScript                                   |
| [`sdk_dart`](./sdk_dart/)                                       | `futrob_sdk`            | Cliente HTTP Dart                                         |
| [`ui`](./ui/)                                                   | `@futrob/ui`            | Tokens y primitivas shadcn/Base UI                        |
| [`shared-kernel`](./shared-kernel/)                             | `@futrob/shared-kernel` | Result, IDs, DomainError, DomainEvent, EventPublisherPort |
| [`test-support`](./test-support/)                               | `@futrob/test-support`  | Fakes/builders de test                                    |

BC packages: `identity`, `organizations`, `competitions`, `teams`, `scheduling`, `game-data`, `results`, `statistics`, `analytics`, `notifications`, `public-portal`.

## Reglas

1. **Domain/application/ports** de cada BC viven en `@futrob/<bc>`, no solo en `apps/web`.
2. El **dominio no importa Zod**. Zod vive en `api-contracts` y en adapters/server de las apps.
3. Los **SDKs no importan** `@futrob/<bc>` ni adapters. Solo contratos + HTTP a `/api/v1`.
4. **EA Clubs** vive en adapters de app (hoy `apps/web/.../game-data/adapters/providers/ea-clubs/`).
5. **`ui` no conoce** competiciones, EA ni permisos.
6. Preferir imports `@futrob/<bc>`, no deep-imports a `src/` internos salvo `exports` públicos.
7. **`apps/api`** (Hono/Node en Railway) ya existe y consume los mismos `@futrob/<bc>`; es dueño de Postgres (`DATABASE_URL`) y del egress Node a EA. No reimplementar use cases en la app; `apps/web` consume el mismo contrato `/api/v1`.
8. En docs del repo, enlaces con ruta absoluta `/packages/...` o `/docs/...`.

## Contrato de `@futrob/ui`

- Light es el tema predeterminado; dark es opt-in explícito.
- Altura universal de controles: 44 px. `dense` es la única compactación (40 px desktop,
  44 px touch).
- Primitivas con variantes cerradas y estilo flat/line.
- `typo-label` para labels y navegación; metadata puede usar sentence-case.
- Verde primario = marca/acción; `approved` = resultado oficialmente aprobado.
- `ButtonIcon` se reserva para CTA de marketing.
- Formularios, navegación, tablas/filas y overlays deben componerse desde `@futrob/ui`, no
  duplicarse con elementos estilizados dentro de un módulo.
- Storybook es el catálogo ejecutable (root): `npm run storybook`.

Especificación: [`/product/design-system-spec.md`](/product/design-system-spec.md) · guía del
package: [`/packages/ui/README.md`](/packages/ui/README.md).

## Quién depende de quién

```text
apps/web ──► @futrob/<bc> + api-contracts + ui + shared-kernel
apps/api ──► @futrob/<bc> + api-contracts + shared-kernel   (Hono/Node, Railway, dueño de Postgres)
apps/cli ──► @futrob/<bc> + shared-kernel + sdk (integración)

@futrob/results ──► @futrob/game-data
@futrob/teams   ──► @futrob/game-data
@futrob/<bc>    ──► @futrob/shared-kernel

@futrob/sdk     ──► @futrob/api-contracts ──► HTTP /api/v1
```

## Cómo añadir un use case

1. Implementarlo en `packages/<bc>/src/application/<name>/`.
2. Exportarlo desde `packages/<bc>/src/index.ts`.
3. Cablear adapters en `apps/web/src/di/` (y luego en `apps/api`).
4. Exponer HTTP vía `api-contracts` + route/handler de la app que sirva `/api/v1`.

## Cómo añadir un endpoint

1. Schemas en `@futrob/api-contracts`.
2. Regenerar OpenAPI.
3. Método en SDK (+ Dart mirror).
4. Handler en `apps/web` (hoy) / `apps/api` (futuro) → use case del package.

## Anti-patrones

- Meter adapters D1/EA/Wrangler dentro de `@futrob/<bc>`.
- Hacer que el SDK importe dominio de packages.
- Duplicar use cases en `apps/web` y `apps/api`.
- Path-alias de `apps/api` hacia `apps/web/src/modules` para dominio.
