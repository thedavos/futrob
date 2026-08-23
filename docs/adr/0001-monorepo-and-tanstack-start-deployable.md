# ADR-0001: Monorepo, deployables y packages de bounded context

- Estado: Aceptada
- Fecha: 2026-07-10
- Actualizada: 2026-08-23
- Relacionado: [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md) · [ADR-0010](/docs/adr/0010-bounded-context-packages.md)

## Contexto

El producto necesita UI web y mobile, BFF, API privada tipada, auth y jobs de sincronización EA. El runtime web Must sigue siendo Cloudflare Workers. `apps/api` sirve la API de producto y el egress Node frente a proveedores compartiendo la misma lógica de negocio.

## Decisión

Usar workspaces npm con:

| App           | Rol                                                                                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web`    | Deployable Must del MVP: TanStack Start + Workers (UI, BFF, `/api/v1` hoy, Queues, Cron)                                                                                                                                                         |
| `apps/api`    | Deployable de API de producto (Hono/Node en Railway); dueño de Postgres (`DATABASE_URL`) y del egress Node a EA; consume los mismos packages de BC                                                                                               |
| `apps/cli`    | Tooling local; no se despliega                                                                                                                                                                                                                   |
| `apps/mobile` | Deployable Must del MVP: cliente móvil React Native + Expo. Consume `/api/v1` con `@futrob/sdk`; auth vía Better Auth (`/api/auth/*`). UI propia en `apps/mobile/src/ui` con tokens compartidos de `@futrob/ui-tokens`. No hay SDK Dart/Flutter. |

La lógica de negocio (**domain + application + ports**) vive en `packages/<bounded-context>/` como `@futrob/<bc>`. Cada app cablea adapters y composition en su propio `di/`.

`/api/v1` se sirve desde `apps/web` (Workers/BFF) y desde `apps/api` (Hono/Node en Railway), siempre sobre los mismos use cases de packages. `apps/api` es dueño de Postgres y del egress Node a EA; `apps/web` consume ese contrato. El SDK (`@futrob/sdk`) habla HTTP al contrato; no importa dominio. El mismo cliente TypeScript sirve a `apps/web` y al cliente móvil MVP (React Native + Expo).

No crear `apps/worker` mientras los stages de sync EA quepan en los límites medidos del Worker/Queue de `apps/web`. La cola permanece durable (Cloudflare Queues) en el lado web.

## Consecuencias

- Web y API comparten BC sin path-alias a `apps/web/src/modules`; mobile no importa BC y consume sus capacidades por SDK.
- Adapters de plataforma (D1, R2, Queues vs Node/Postgres/egress) viven por app.
- Hay que versionar y typecheck más workspaces.

## Alternativas rechazadas

- Mantener dominio solo en `apps/web` con alias `@/*` para otros apps (no escala a API de producto).
- Tres apps desde el día uno sin packages de BC.
- Vercel + Supabase como plataforma Must.
- `apps/api` que solo reexporte el SDK HTTP hacia sí mismo (sin use cases).
