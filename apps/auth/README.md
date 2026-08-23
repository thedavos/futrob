# `@futrob/auth` — futrob-auth Worker

Better Auth como **Worker de Cloudflare independiente** ([ADR-0015](../../docs/adr/0015-auth-extraction.md)).
Sirve `/api/auth/*` (email/password + sesiones Bearer para móvil) contra la misma
base D1 (`futrob-app`) que `apps/web`.

`apps/web` es proxy-only en `/api/auth/*` y solo lee sesiones contra D1.

## Migraciones

Este app es el dueño de la única historia de migraciones para la D1 compartida:
schema de auth, tabla web de BFF rate limit y rate limit de Better Auth
(`0001_better_auth_and_actors`, `0002_bff_rate_limit`,
`0003_better_auth_rate_limit`).

```bash
cd apps/auth
npx wrangler d1 migrations apply futrob-app --local --persist-to ../web/.wrangler/state
```

La ubicación de una migración no cambia el dueño lógico de cada tabla. Web sigue
siendo dueño de `app_rate_limit_windows`, pero no mantiene un segundo directorio
contra la misma tabla global `d1_migrations`.

## Desarrollo local

```bash
npm run dev                   # incluye este worker en :8788
# o
npm run dev -w @futrob/auth
```

El script usa `--persist-to ../web/.wrangler/state`, así que lee/escribe **el mismo
estado D1 local** que `apps/web`. Sin `--persist-to`, Wrangler crea otro estado
local bajo `apps/auth/.wrangler/state` que el worker no usa. El inspector de
Wrangler va a `18788` para no chocar con `apps/web` (`13000`) ni con el rango
por defecto `9229`.

Variables: copia `.dev.vars.example` → `.dev.vars`. `BETTER_AUTH_SECRET` debe
coincidir con `apps/web/.dev.vars`. `BETTER_AUTH_URL` es el origen público de
web (`http://localhost:3000`). `APP_BASE_URL` alimenta `trustedOrigins` en
producción. El Worker responde 503 si falta un secreto de al menos 32 caracteres
o si un origen no es un origen HTTP(S) válido.

## Despliegue

Configura el `database_id` real antes del primer despliegue. Aplica migraciones y
carga el mismo secreto que usa web sin escribirlo en archivos versionados:

```bash
cd apps/auth
npx wrangler d1 migrations apply futrob-app --remote
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler deploy
curl --fail https://futrob-auth.futrob-workers.workers.dev/meta/health
```

Despliega web después de que health responda 200. Una rotación de
`BETTER_AUTH_SECRET` debe actualizar auth y web en la misma ventana.

## Endpoints

- `POST /api/auth/sign-up/email` · `POST /api/auth/sign-in/email`
- `GET /api/auth/get-session` (cookie **o** `Authorization: Bearer <token>`)
- `GET /meta/health`

## Nota de diseño

Sin `tanstackStartCookies()`. Este worker sirve fetch plano. Better Auth lee y
escribe cookies en Request/Response. El plugin `bearer()` atiende clientes
nativos. Better Auth persiste el rate limit en D1 y confía solo en
`CF-Connecting-IP`.
