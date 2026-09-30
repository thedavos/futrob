# `@futrob/auth` — futrob-auth Worker

Better Auth como **Worker de Cloudflare independiente** ([ADR-0015](../../docs/adr/0015-auth-extraction.md)).
Sirve `/api/auth/*` (email/password + sesiones Bearer para móvil) contra el **mismo
Postgres que `apps/api`**, a través de Hyperdrive
([ADR-0021](../../docs/adr/0021-auth-and-actors-in-product-postgres.md)).

`apps/web` es proxy-only en `/api/auth/*`. Pide `get-session` a este Worker, cuya
respuesta ya incluye el `actorId`; web no lee tablas de auth ni de identidad.

## Datos y migraciones

Este app es el único escritor de `auth_users`, `auth_sessions`, `auth_accounts`,
`auth_verifications`, `auth_rate_limits`, `actors` e `identity_subjects`. Las tablas se
crean en `apps/api/migrations` (`0043_auth_and_actors.sql`), la única historia de
migraciones; **este app no tiene carpeta de migraciones**.

```bash
npm run migrate -w @futrob/api      # aplica las migraciones pendientes a DATABASE_URL
```

`src/adapters/auth/drizzle-schema.ts` es el espejo Drizzle de esa migración; la prueba
`auth-postgres.integration.test.ts` (con `TEST_DATABASE_URL`) verifica que coinciden.
Cada request abre una conexión `pg` corta (`database.ts`) y la cierra con
`ctx.waitUntil`; Hyperdrive hace el pooling.

Los actores se crean antes de emitir la sesión (`databaseHooks.session.create.before`),
en una transacción serializada por sujeto con un advisory lock. Las tablas de producto
referencian `actors(id)` con FK `ON DELETE RESTRICT` (`0044_actor_foreign_keys.sql`).

## Desarrollo local

```bash
npm run dev                   # incluye este worker en :8788
# o
npm run dev -w @futrob/auth
```

Necesita dos archivos locales (ambos ignorados por git):

- `.dev.vars` (desde `.dev.vars.example`): `BETTER_AUTH_SECRET` debe coincidir con
  `apps/web/.dev.vars`. `BETTER_AUTH_URL` es el origen público de web
  (`http://localhost:3000`). `APP_BASE_URL` alimenta `trustedOrigins` en producción. El
  Worker responde 503 si falta un secreto de al menos 32 caracteres o si un origen no
  es un origen HTTP(S) válido.
- `.env` (desde `.env.example`): `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`
  con el mismo valor que `DATABASE_URL` de `apps/api`. Wrangler no lee esta variable de
  `.dev.vars`. Sin ella `wrangler dev` falla al arrancar.

El inspector de Wrangler va a `18788` para no chocar con `apps/web` (`13000`) ni con el
rango por defecto `9229`.

## Despliegue

Crea la configuración de Hyperdrive apuntando al Postgres de producción (Railway; debe
ser alcanzable con TLS) y pon su id en `wrangler.jsonc`. Aplica las migraciones y carga
el mismo secreto que usa web sin escribirlo en archivos versionados:

```bash
npx wrangler hyperdrive create futrob-postgres --connection-string="<DATABASE_URL>"
npm run migrate -w @futrob/api      # con DATABASE_URL de producción
cd apps/auth
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler deploy
curl --fail https://futrob-auth.futrob-workers.workers.dev/meta/health
```

`/meta/health` conecta a Postgres y comprueba que existan las tablas requeridas.
Despliega web después de que health responda 200. Una rotación de `BETTER_AUTH_SECRET`
debe actualizar auth y web en la misma ventana.

## Endpoints

- `POST /api/auth/sign-up/email` · `POST /api/auth/sign-in/email`
- `GET /api/auth/get-session` (cookie **o** `Authorization: Bearer <token>`); devuelve
  `{ user, session, actorId }`. `actorId` es `null` si el usuario aún no tiene actor.
- `GET /meta/health`

## Nota de diseño

Sin `tanstackStartCookies()`. Este worker sirve fetch plano. Better Auth lee y
escribe cookies en Request/Response. El plugin `bearer()` atiende clientes
nativos y `customSession()` añade el `actorId`. Better Auth persiste el rate limit en
Postgres (`auth_rate_limits`) y confía solo en `CF-Connecting-IP`.
