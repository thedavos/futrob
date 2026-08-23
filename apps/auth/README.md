# `@futrob/auth` — futrob-auth Worker

Better Auth como **Worker de Cloudflare independiente** ([ADR-0015](../../docs/adr/0015-auth-extraction.md)).
Sirve `/api/auth/*` (email/password + sesiones Bearer para móvil) contra la misma
base D1 (`futrob-app`) que `apps/web`.

`apps/web` es proxy-only en `/api/auth/*` y solo lee sesiones contra D1.

## Migraciones

Este app es el dueño del schema D1 de **auth** y de los contadores persistentes
de rate limit (`0001_better_auth_and_actors`, `0002_better_auth_rate_limit`):

```bash
cd apps/auth
npx wrangler d1 migrations apply futrob-app --local --persist-to ../web/.wrangler/state
```

`apps/web` mantiene su propio lineage para tablas que le pertenecen (BFF rate
limit) sobre la misma base. Los nombres completos de migración no se solapan.
Aplica ambos directorios en un setup fresco.

## Desarrollo local

```bash
npm run dev                   # incluye este worker en :8788
# o
npm run dev -w @futrob/auth
```

El script usa `--persist-to ../web/.wrangler/state`, así que lee/escribe **el mismo
estado D1 local** que `apps/web`. Aplica las migraciones desde `apps/auth` (y
`0002` desde `apps/web`) antes de levantar el worker. Sin `--persist-to`,
Wrangler crea otro estado local bajo `apps/auth/.wrangler/state` que el worker
no usa.

Variables: copia `.dev.vars.example` → `.dev.vars`. `BETTER_AUTH_SECRET` debe
coincidir con `apps/web/.dev.vars`. `BETTER_AUTH_URL` es el origen público de
web (`http://localhost:3000`). `APP_BASE_URL` alimenta `trustedOrigins` en
producción. El Worker responde 503 si falta un secreto de al menos 32 caracteres
o si un origen no es un origen HTTP(S) válido.

## Endpoints

- `POST /api/auth/sign-up/email` · `POST /api/auth/sign-in/email`
- `GET /api/auth/get-session` (cookie **o** `Authorization: Bearer <token>`)
- `GET /meta/health`

## Nota de diseño

Sin `tanstackStartCookies()`. Este worker sirve fetch plano. Better Auth lee y
escribe cookies en Request/Response. El plugin `bearer()` atiende clientes
nativos. Better Auth persiste el rate limit en D1 y confía solo en
`CF-Connecting-IP`.
