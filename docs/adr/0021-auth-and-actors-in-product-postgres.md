# ADR-0021: Auth, actores y rate limits en el Postgres de producto

- Estado: Propuesta
- Fecha: 2026-09-29
- Relacionado: [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md),
  [ADR-0004](/docs/adr/0004-multi-tenant-d1-scoping.md),
  [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md)
- Reemplaza: [ADR-0015](/docs/adr/0015-auth-extraction.md), solo el almacenamiento en D1
  (puntos 3, 5, 6 y 7 en lo relativo a D1). Siguen vigentes el Worker `apps/auth`,
  el proxy por `AUTH_SERVICE`, `bearer()` para Expo y el ownership de Actor/IdentitySubject.
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Auth, actores y rate limits BFF viven en una D1 compartida entre `apps/web` y
`apps/auth`, mientras el producto vive en Postgres (`apps/api`). Esto produce:

- Columnas `*actor_id` en más de 20 columnas de producto sin integridad referencial,
  porque `actors` está en otra base.
- Dos historias de migraciones, un schema Drizzle SQLite duplicado en web/auth con test
  de lockstep y reintentos por bloqueos de Miniflare al compartir el SQLite local.
- El provisionamiento de actores usa borrado compensatorio porque D1 no ofrece
  transacciones interactivas.

El proyecto está en desarrollo: no hay base de producción ni usuarios que migrar.

## Decisión propuesta

1. Better Auth, `actors`, `identity_subjects` y los rate limits (Better Auth y BFF)
   se almacenan en el **mismo Postgres que la API de producto** (Neon en desarrollo,
   Railway Postgres en producción). D1 se retira del proyecto.
2. `apps/api/migrations` es la **única historia de migraciones**. La ubicación no cambia
   el ownership: `apps/auth` es el único escritor de tablas Better Auth, `actors` e
   `identity_subjects`; `apps/web` solo escribe `app_rate_limit_windows`; la API no lee
   tablas Better Auth.
3. Las columnas de producto que referencian actores tienen FK a `actors (id)` con
   `ON DELETE RESTRICT`.
4. Los Workers acceden a Postgres mediante **Hyperdrive** con un driver Postgres genérico,
   sin drivers específicos de un proveedor. En local, Hyperdrive usa la cadena de conexión
   de desarrollo.
5. `get-session` de `apps/auth` devuelve el `actorId` resuelto. Web obtiene el actor de
   esa respuesta y deja de consultar `identity_subjects`; no conserva schema de auth.
6. Tablas Better Auth con prefijo `auth_` y columnas snake_case, para evitar la palabra
   reservada `user` y seguir las convenciones del schema de producto.

## Consecuencias

- Integridad referencial y transacciones entre identidad y producto; una sola
  herramienta de migraciones y backups.
- Se eliminan el schema duplicado, el test de lockstep, los reintentos D1 y el estado
  local compartido con `--persist-to`.
- Postgres pasa a ser obligatorio en local para autenticarse.
- Cada request autenticado depende de la latencia Worker → Postgres; se mitiga con
  Hyperdrive y, si hace falta, con la caché de sesión en cookie de Better Auth.
- En producción, Railway Postgres debe ser accesible desde Hyperdrive (red pública con TLS).
- Con FKs, un `actorId` inexistente falla al escribir. El CLI y las pruebas de
  integración deben usar actores existentes; `INITIAL_SUPERUSER_ACTOR_ID` debe
  referenciar un actor ya provisionado.

## Alternativas consideradas

- **Mantener D1.** Sin coste de migración, pero conserva las dos bases y la falta de FKs.
- **Auth en un Postgres separado (Neon solo para auth).** Añade una tercera pieza sin
  resolver la integridad referencial.
- **Auth como servicio Node en Railway.** Evita Hyperdrive, pero añade un runtime y
  deshace la extracción a Worker de ADR-0015 sin necesidad.
- **Rate limits BFF en Durable Objects o en el binding de Rate Limiting.** El binding no
  admite ventanas de 900 s; Durable Objects añade otra pieza de estado para un volumen bajo.

## Estado de implementación y evidencia

Sin implementar. Situación actual:

- [Worker auth sobre D1](/apps/auth/src/adapters/auth/better-auth.ts).
- [Lookup de actor en web](/apps/web/src/modules/identity/server/authenticated-request-actor.ts).
- [Rate limiter BFF en D1](/apps/web/src/shared/infrastructure/rate-limit/d1-bff-rate-limiter.ts).
- [Migraciones de producto](/apps/api/migrations/).
