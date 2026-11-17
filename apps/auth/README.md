# `@futrob/auth` — servidor de auth

Better Auth como **servidor Hono sobre Node** ([ADR-0015](../../docs/adr/0015-auth-extraction.md),
[ADR-0032](../../docs/adr/0032-auth-node-runtime.md)). Sirve `/api/auth/*`
(email/password + sesiones Bearer para móvil) contra el **mismo Postgres que `apps/api`**
([ADR-0021](../../docs/adr/0021-auth-and-actors-in-product-postgres.md)). No depende de un
proveedor de hosting: arranca con `npm run start` y se configura por variables de entorno.

`apps/web` es proxy-only en `/api/auth/*` y llega a este servidor por HTTP
(`FUTROB_AUTH_BASE_URL`). Pide `get-session`, cuya respuesta ya incluye el `actorId`; web no
lee tablas de auth ni de identidad. La app móvil puede llamar directo
(`EXPO_PUBLIC_FUTROB_AUTH_BASE_URL`) o a través de web.

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
El proceso usa un solo pool `pg` (`database.ts`, máximo 5 conexiones) sobre `DATABASE_URL`.

Los actores se crean antes de emitir la sesión (`databaseHooks.session.create.before`),
en una transacción serializada por sujeto con un advisory lock. Las tablas de producto
referencian `actors(id)` con FK `ON DELETE RESTRICT` (`0044_actor_foreign_keys.sql`).

## Desarrollo local

```bash
npm run dev                   # incluye este servidor en :8788 (tsx watch)
# o
npm run dev -w @futrob/auth
```

Necesita `apps/auth/.env` (desde `.env.example`, ignorado por git). El servidor lo carga al
arrancar; las variables ya definidas en el entorno tienen prioridad.

- `DATABASE_URL`: la misma base que `apps/api`.
- `BETTER_AUTH_SECRET`: el mismo valor que en `apps/web/.dev.vars`, de al menos 32
  caracteres. `BETTER_AUTH_URL` es el origen público de web (`http://localhost:3000`).
  `APP_BASE_URL` y `BETTER_AUTH_TRUSTED_ORIGINS` deben ser orígenes HTTP(S) válidos.
- `AUTH_PROXY_SECRET`: el mismo valor que en `apps/web/.dev.vars`.
- Deja `NODE_ENV=development` y `SENTRY_DSN` vacío: Sentry no envía nada desde esta máquina.

Si falta o no es válida alguna variable, el proceso no arranca y el error nombra la
variable.

### Correo de cuenta

`AUTH_EMAIL_DELIVERY` elige cómo salen el cambio de correo y el restablecimiento de
contraseña: `log` escribe el enlace en el log del servidor (desarrollo), `resend` lo envía por
la API HTTP de Resend ([ADR-0031](../../docs/adr/0031-transactional-email-provider-and-outbox.md))
y exige `RESEND_API_KEY` (secreto) y `EMAIL_FROM`. Sin valor, ambos flujos responden
deshabilitados. Los enlaces son secretos de vida corta: se envían al momento y no pasan por
el outbox de producto. Al apagarse, el servidor espera los envíos en curso.

## IP del cliente

Better Auth limita por IP. El servidor escribe la IP en `x-futrob-client-ip` tras borrar
cualquier valor recibido, en este orden:

1. Si la request trae `x-futrob-proxy-secret` igual a `AUTH_PROXY_SECRET`, usa la IP que
   reenvía web (web la toma de `CF-Connecting-IP`).
2. Si no, y `AUTH_TRUSTED_IP_HEADER` está definida, usa esa cabecera del balanceador; en una
   lista toma el último salto.
3. Si no, usa la dirección TCP del par.

Detrás de un balanceador, define `AUTH_TRUSTED_IP_HEADER` con la cabecera que ese proveedor
garantiza (por ejemplo `x-real-ip` o `x-forwarded-for`) y confírmala en su documentación. Sin
ella, todos los clientes directos comparten la IP del balanceador en el rate limit.

## Despliegue

Cualquier plataforma que ejecute Node 24 sobre el monorepo:

- Instalación: `npm ci` desde la raíz del repositorio (usa los workspaces
  `@futrob/identity`, `@futrob/logger` y `@futrob/shared-kernel`). `tsx` es una dependencia
  de desarrollo, igual que en `apps/api`: no instales con `--omit=dev`.
- Arranque: `npm run start -w @futrob/auth`. Escucha en `PORT`.
- Healthcheck: `GET /meta/health` (200 con Postgres y tablas listas, 503 si no).
- Apagado: maneja `SIGTERM`.
- Variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_BASE_URL`,
  `BETTER_AUTH_TRUSTED_ORIGINS`, `AUTH_PROXY_SECRET`, `AUTH_TRUSTED_IP_HEADER`,
  `NODE_ENV=production`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `AUTH_EMAIL_DELIVERY`,
  `RESEND_API_KEY`, `EMAIL_FROM`.

Si la app móvil llama directo, incluye el origen público de auth en
`BETTER_AUTH_TRUSTED_ORIGINS`. Aplica las migraciones fuera del arranque
(`npm run migrate -w @futrob/api` con la `DATABASE_URL` de producción). Despliega web
después de que health responda 200, con `FUTROB_AUTH_BASE_URL` y el secreto
`AUTH_PROXY_SECRET`. `BETTER_AUTH_SECRET` y `AUTH_PROXY_SECRET` se rotan en auth y web en la
misma ventana.

## Endpoints

- `POST /api/auth/sign-up/email` · `POST /api/auth/sign-in/email`
- `GET /api/auth/get-session` (cookie **o** `Authorization: Bearer <token>`); devuelve
  `{ user, session, actorId }`. `actorId` es `null` si el usuario aún no tiene actor.
- `POST /api/auth/request-password-reset` `{ email, redirectTo }` — misma respuesta exista o
  no la cuenta; el correo sale después de responder (tarea en segundo plano). `redirectTo` es
  `/reset-password` (web) o `futrob://reset-password` (app). Límite: 3 por minuto por IP y
  3 enlaces vigentes por cuenta.
- `GET /api/auth/reset-password/:token?callbackURL=…` — redirige al destino con `?token=` o
  `?error=INVALID_TOKEN`.
- `POST /api/auth/reset-password` `{ token, newPassword }` — enlace de un solo uso (1 hora);
  invalida los demás enlaces de la cuenta y cierra todas sus sesiones.
- Verificación de correo (AUTH-02): el registro abre sesión al instante y envía un enlace
  (1 hora). Todo enlace aterriza en la página web `/verify-email`, la pida web o la app.
  `POST /api/auth/send-verification-email` `{ email, callbackURL }` reenvía a la cuenta con
  sesión (3 por minuto por IP). `GET /api/auth/verify-email?token=…` verifica una vez; un
  enlace ya usado vuelve con `?error=TOKEN_USED` y uno vencido con `?error=TOKEN_EXPIRED`.
  `auth_users.email_verified` se proyecta en `actor_contact_profiles.email_verified`.
- `GET /meta/health`

## Nota de diseño

Sin `tanstackStartCookies()`. Hono entrega a Better Auth Request/Response estándar, y
Better Auth lee y escribe las cookies en ellos. El plugin `bearer()` atiende clientes
nativos y `customSession()` añade el `actorId`. Better Auth persiste el rate limit en
Postgres (`auth_rate_limits`) y lee la IP solo de `x-futrob-client-ip`, que el servidor
escribe en cada request (ver «IP del cliente»).
