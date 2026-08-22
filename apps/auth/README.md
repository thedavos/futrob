# `@futrob/auth` — futrob-auth Worker

Better Auth como **Worker de Cloudflare independiente** ([ADR-0015](../../docs/adr/0015-auth-extraction.md)).
Sirve `/api/auth/*` (email/password + sesiones Bearer para móvil) contra la misma
base D1 (`futrob-app`) que `apps/web`.

## Estrategia por etapas

| Etapa | Estado | Descripción                                                                                                                                         |
| ----- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | ✅     | Parallel run: web mantiene su auth embebida; este worker corre junto, misma D1 y secret → las sesiones son intercambiables entre orígenes           |
| 2     | ✅     | Móvil apunta directo (`EXPO_PUBLIC_FUTROB_AUTH_BASE_URL`); web hace proxy same-origin `/api/auth/* → FUTROB_AUTH_SERVICE_URL` con fallback embebido |
| 3     | ✅     | Web es proxy-only (503 sin la var) y este worker es **dueño del schema/migrations** (`migrations/`); web conserva binding D1 read-only para SSR     |

## Migraciones

Este app es el dueño del schema D1 de **auth** (`0001_better_auth_and_actors`):

```bash
cd apps/auth && npx wrangler d1 migrations apply futrob-app --local
```

Nota: `apps/web` mantiene su propio lineage de migraciones para tablas que le
pertenecen (BFF rate limit) sobre la misma base; los nombres de archivo no se
solapan entre ambos dirs.

## Desarrollo local

```bash
npm run dev -w @futrob/auth   # http://localhost:8788
```

El script usa `--persist-to ../web/.wrangler/state`, así que lee/escribe **el mismo
estado D1 local** que `apps/web`: una sesión creada aquí es válida para el BFF de
web y viceversa. Requiere haber aplicado las migraciones desde web
(`cd apps/web && npx wrangler d1 migrations apply futrob-app --local`).

Variables: copia `.dev.vars.example` → `.dev.vars`. `BETTER_AUTH_URL` vacío cae al
origen del worker.

## Endpoints

- `POST /api/auth/sign-up/email` · `POST /api/auth/sign-in/email`
- `GET /api/auth/get-session` (cookie **o** `Authorization: Bearer <token>`)
- `GET /meta/health`

## Nota de diseño

Sin `tanstackStartCookies()`: ese plugin existe para incrustar Better Auth dentro
de TanStack Start. Este worker sirve fetch plano — el core de Better Auth setea
lee cookies en Request/Response por sí solo. Plugins activos: `bearer()`.
