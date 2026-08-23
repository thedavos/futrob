# `@futrob/auth` — futrob-auth Worker

Better Auth como **Worker de Cloudflare independiente** ([ADR-0015](../../docs/adr/0015-auth-extraction.md)).
Sirve `/api/auth/*` (email/password + sesiones Bearer para móvil) contra la misma
base D1 (`futrob-app`) que `apps/web`.

`apps/web` es proxy-only en `/api/auth/*` y solo lee sesiones contra D1.

## Migraciones

Este app es el dueño del schema D1 de **auth** (`0001_better_auth_and_actors`):

```bash
cd apps/auth && npx wrangler d1 migrations apply futrob-app --local
```

`apps/web` mantiene su propio lineage para tablas que le pertenecen (BFF rate
limit) sobre la misma base. Los nombres de archivo no se solapan: auth usa
`0xxx`, web usa `1xxx` a partir de `0002`. Aplica ambos directorios en un setup
fresco.

## Desarrollo local

```bash
npm run dev                   # incluye este worker en :8788
# o
npm run dev -w @futrob/auth
```

El script usa `--persist-to ../web/.wrangler/state`, así que lee/escribe **el mismo
estado D1 local** que `apps/web`. Aplica las migraciones desde `apps/auth` (y
`0002` desde `apps/web`) antes de levantar el worker.

Variables: copia `.dev.vars.example` → `.dev.vars`. `BETTER_AUTH_SECRET` debe
coincidir con `apps/web/.dev.vars`. `BETTER_AUTH_URL` es el origen público de
web (`http://localhost:3000`). `APP_BASE_URL` alimenta `trustedOrigins` en
producción.

## Endpoints

- `POST /api/auth/sign-up/email` · `POST /api/auth/sign-in/email`
- `GET /api/auth/get-session` (cookie **o** `Authorization: Bearer <token>`)
- `GET /meta/health`

## Nota de diseño

Sin `tanstackStartCookies()`. Este worker sirve fetch plano. Better Auth lee y
escribe cookies en Request/Response. Plugins activos: `bearer()`.
