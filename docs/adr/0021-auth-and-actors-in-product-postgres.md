# ADR-0021: Auth, actores y rate limits en el Postgres de producto

- Estado: Aceptada
- Fecha: 2026-09-29
- Relacionado: [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md),
  [ADR-0004](/docs/adr/0004-multi-tenant-d1-scoping.md),
  [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md)
- Reemplaza: [ADR-0015](/docs/adr/0015-auth-extraction.md), solo el almacenamiento en D1
  (puntos 3, 5, 6 y 7 en lo relativo a D1). Siguen vigentes el Worker `apps/auth`,
  el proxy por `AUTH_SERVICE`, `bearer()` para Expo y el ownership de Actor/IdentitySubject.
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Auth, actores y rate limits BFF vivían en una D1 compartida entre `apps/web` y
`apps/auth`, mientras el producto vive en Postgres (`apps/api`). Esto producía:

- Columnas `*actor_id` en 27 columnas de producto sin integridad referencial, porque
  `actors` estaba en otra base.
- Dos historias de migraciones, un schema Drizzle SQLite duplicado en web/auth con test
  de lockstep y reintentos por bloqueos de Miniflare al compartir el SQLite local.
- Provisionamiento de actores con borrado compensatorio, porque D1 no ofrece
  transacciones interactivas.

El proyecto está en desarrollo: no había base de producción ni usuarios que migrar. La
decisión la tomó el responsable del proyecto el 2026-09-29.

## Decisión

1. Better Auth, `actors`, `identity_subjects` y los rate limits (Better Auth y BFF) se
   almacenan en el **mismo Postgres que la API de producto** (Neon en desarrollo,
   Railway Postgres en producción). D1 se retira del proyecto.
2. `apps/api/migrations` es la **única historia de migraciones**
   (`0043_auth_and_actors.sql`, `0044_actor_foreign_keys.sql`). La ubicación no cambia el
   ownership: `apps/auth` es el único escritor de las tablas `auth_*`, `actors` e
   `identity_subjects`; `apps/web` solo escribe `app_rate_limit_windows`; la API no lee
   tablas Better Auth. Las migraciones se aplican con `npm run migrate -w @futrob/api`,
   fuera del request path.
3. Toda columna de producto que guarda un `ActorId` referencia `actors (id)` con
   `ON DELETE RESTRICT`; `identity_subjects.actor_id` usa `ON DELETE CASCADE`. Un actor
   con historial de producto no se borra implícitamente.
4. Los Workers (`apps/auth` y `apps/web`) acceden a Postgres mediante **Hyperdrive** con
   `pg`, sin drivers específicos de un proveedor. Abren una conexión corta por request
   (o por comprobación de rate limit) y la cierran; Hyperdrive hace el pooling. En local
   el binding apunta a `DATABASE_URL` mediante
   `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` en `.env` de cada Worker.
5. `get-session` de `apps/auth` (plugin `customSession`) devuelve `{ user, session,
actorId }`. Web toma el actor de esa respuesta y no consulta tablas de identidad ni
   conserva schema de auth. `actorId: null` se trata como no autenticado.
6. Tablas Better Auth con prefijo `auth_` y columnas snake_case, para evitar la palabra
   reservada `user` y seguir las convenciones del schema de producto.
7. El provisionamiento de actores es una transacción serializada por sujeto mediante un
   advisory lock transaccional; sin borrado compensatorio.
8. `INITIAL_SUPERUSER_ACTOR_ID` debe referenciar un actor existente. Si no existe, la API
   arranca, registra una advertencia y omite el bootstrap; se reintenta en el siguiente
   arranque.

## Consecuencias

- Integridad referencial y transacciones entre identidad y producto; una sola
  herramienta de migraciones y backups.
- Se eliminan el schema duplicado, el test de lockstep, los reintentos D1 y el estado
  local compartido con `--persist-to`.
- Postgres pasa a ser obligatorio en local para autenticarse. La API sola sigue
  funcionando sin `DATABASE_URL` con stores en memoria.
- Cada request autenticado depende de la latencia Worker → Postgres. Se mitiga con
  Hyperdrive; si hace falta, con la caché de sesión en cookie de Better Auth. No se
  midió la latencia.
- Con FKs, escribir un `actorId` inexistente falla. Las pruebas de integración registran
  sus actores (`apps/api/src/testing/seed-actors.ts`) y el CLI necesita un actor real
  para escrituras.
- En producción, Railway Postgres debe ser accesible desde Hyperdrive (red pública con TLS).
- Con Neon como destino de desarrollo, usar el endpoint directo o el pooler en modo
  transacción: el código no depende de estado de sesión (solo `pg_advisory_xact_lock`).

## Alternativas consideradas

- **Mantener D1.** Sin coste de migración, pero conserva las dos bases y la falta de FKs.
- **Auth en un Postgres separado.** Añade una tercera pieza sin resolver la integridad
  referencial.
- **Auth como servicio Node en Railway.** Evita Hyperdrive, pero añade un runtime y
  deshace la extracción a Worker de ADR-0015 sin necesidad.
- **Driver serverless específico de Neon.** Ata el código al proveedor de desarrollo
  cuando producción será Railway.
- **Rate limits BFF en Durable Objects o en el binding de Rate Limiting.** El binding no
  admite ventanas de 900 s; Durable Objects añade otra pieza de estado para un volumen bajo.

## Cuestiones pendientes

- Crear la configuración real de Hyperdrive para Railway y sustituir el `id` de
  marcador en `apps/auth/wrangler.jsonc` y `apps/web/wrangler.jsonc`.
- Medir la latencia de `get-session` con Hyperdrive y decidir si activar la caché de
  sesión en cookie.

## Estado de implementación y evidencia

Implementado en el checkout; no desplegado.

- [Worker auth](/apps/auth/src/index.ts), [conexión](/apps/auth/src/adapters/auth/database.ts),
  [provisionador](/apps/auth/src/adapters/auth/actor-provisioner.ts) y
  [schema Drizzle](/apps/auth/src/adapters/auth/drizzle-schema.ts).
- [Migración de tablas](/apps/api/migrations/0043_auth_and_actors.sql) y
  [FKs a actores](/apps/api/migrations/0044_actor_foreign_keys.sql);
  [runner](/apps/api/src/migrate.ts).
- [Resolución del actor en web](/apps/web/src/modules/identity/server/authenticated-request-actor.ts)
  y [rate limiter Postgres](/apps/web/src/shared/infrastructure/rate-limit/postgres-bff-rate-limiter.ts).

Comprobado durante el trabajo, contra un Postgres Neon real:

- Las 44 migraciones aplican desde cero en una base limpia (se borró y recreó el schema
  `public` de desarrollo).
- Pruebas de integración de auth: schema Drizzle contra la migración, un solo actor bajo
  8 provisiones concurrentes y registro → `get-session` con `actorId`.
- Pruebas de integración del limitador BFF (incluida concurrencia) y la suite completa de
  la API con `TEST_DATABASE_URL`.
- Stack local: registro, login, `get-session` por cookie y Bearer, contraseña errónea,
  mismo actor tras un segundo login y una llamada BFF autenticada de web hasta la API.
- El bundle de producción de web compila con `pg`.

No comprobado: Hyperdrive contra Railway; el limitador BFF ejecutándose dentro de un
Worker de web (en `vp dev` se omite por `NODE_ENV=development`; solo se validaron su SQL y
su transacción contra Postgres); el cliente Expo contra la nueva respuesta de
`get-session`.
