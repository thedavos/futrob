# ADR-0032: Auth como servidor Node (Hono) fuera de Cloudflare

- Estado: Aceptada
- Fecha: 2026-11-17
- Relacionado: [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md),
  [ADR-0005](/docs/adr/0005-typed-private-api.md)
- Reemplaza parcialmente: [ADR-0015](/docs/adr/0015-auth-extraction.md) (runtime Worker,
  proxy por `AUTH_SERVICE` y `CF-Connecting-IP` en auth) y
  [ADR-0021](/docs/adr/0021-auth-and-actors-in-product-postgres.md) (acceso de auth por
  Hyperdrive, punto 4, y la alternativa descartada «Auth como servicio Node»).
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

`apps/auth` corría como Worker de Cloudflare y llegaba al Postgres de producto por
Hyperdrive. Web lo alcanzaba por el service binding `AUTH_SERVICE`. Nada estaba
desplegado: la configuración de Hyperdrive seguía con un `id` de marcador.

El Postgres de producto y la API viven fuera de Cloudflare (Railway previsto, AWS en
evaluación). Mantener auth en Workers obliga a exponer Postgres por TCP público para
Hyperdrive y ata el servicio a un proveedor que no aloja la base. La lógica de auth no
depende del runtime: Better Auth expone un handler `fetch`, la persistencia usa `pg` con
Drizzle y el dominio vive en `@futrob/identity`.

## Decisión

1. `apps/auth` es un servidor **Hono sobre Node** (`@hono/node-server`), con el mismo
   patrón que `apps/api`: `tsx src/main.ts`, `PORT` (8788 por defecto) y configuración por
   variables de entorno validadas al arrancar. No depende de un proveedor de hosting.
2. Un **pool `pg`** por proceso sobre `DATABASE_URL` y una instancia de Better Auth por
   proceso. Drizzle toma un cliente por consulta y por transacción, así que el advisory
   lock del provisionamiento de actores sigue en una sola conexión.
3. El correo de cuenta se ejecuta después de la respuesta como tarea en segundo plano.
   `SIGTERM`/`SIGINT` cierran el servidor, esperan esas tareas, cierran el pool y vacían
   Sentry (`@sentry/node`).
4. Web (que sigue en Workers) alcanza auth por **HTTP** en `FUTROB_AUTH_BASE_URL`. Cada
   llamada lleva `x-futrob-proxy-secret` (`AUTH_PROXY_SECRET`, compartido entre web y auth)
   y la IP del cliente en `x-futrob-client-ip`, tomada de `CF-Connecting-IP`.
5. Better Auth lee la IP solo de `x-futrob-client-ip`, que auth escribe en cada request
   tras borrar el valor recibido. Orden de confianza:
   1. la IP que reenvía web, si el secreto coincide (comparación de tiempo constante);
   2. si no, la cabecera del balanceador nombrada en `AUTH_TRUSTED_IP_HEADER` (último
      salto de la lista);
   3. si no, la dirección TCP del par.
6. Se conservan: `/api/auth/*`, `/meta/health` (conexión y tablas requeridas), `bearer()`
   para Expo, `get-session` con `actorId`, el ownership de Actor/IdentitySubject y
   `apps/api/migrations` como única historia de esquema.

## Consecuencias

- Auth deja de necesitar Hyperdrive y Wrangler. Web sigue usando Hyperdrive para el
  limitador BFF, así que Postgres necesita acceso para web mientras web siga en Workers.
- Cada SSR/BFF autenticado hace `get-session` por HTTPS desde el edge hasta la región de
  auth. Antes cruzaba Worker → Hyperdrive → Postgres; ahora auth habla con Postgres en su
  red. No se midió la latencia; la caché de sesión en cookie de Better Auth sigue como
  mitigación disponible.
- Auth queda expuesta en internet para clientes nativos. Sin `AUTH_TRUSTED_IP_HEADER`
  detrás de un balanceador, todos los clientes directos comparten la IP del balanceador
  en el rate limit. El valor depende del proveedor y debe confirmarse al desplegar.
- `AUTH_PROXY_SECRET` y `BETTER_AUTH_SECRET` se rotan en web y auth en la misma ventana.
- En desarrollo, auth lee `apps/auth/.env` (ya no `.dev.vars`) y web no depende del
  registro de Workers locales de Wrangler.

## Alternativas consideradas

- **Mantener el Worker con Hyperdrive.** Sin cambios de código, pero ata auth a
  Cloudflare mientras la base vive en otro proveedor.
- **Integrar auth en `apps/api`.** Ahorra un servicio, pero mezcla la autoridad de
  credenciales con la API de producto y su ciclo de despliegue (ADR-0015).
- **Confiar en una cabecera de plataforma para todo, sin secreto.** Las llamadas
  reenviadas por web llegarían con la IP de salida de Cloudflare y compartirían un solo
  límite.
- **Poner Cloudflare como proxy delante de auth.** Recupera `CF-Connecting-IP`, pero exige
  bloquear el acceso directo al origen y vuelve a depender de Cloudflare.

## Estado de implementación y evidencia

Implementado en el checkout; no desplegado. Proveedor de hosting sin decidir.

- [Arranque](/apps/auth/src/main.ts), [app Hono](/apps/auth/src/app.ts),
  [IP del cliente](/apps/auth/src/client-ip.ts), [pool](/apps/auth/src/adapters/auth/database.ts),
  [configuración](/apps/auth/src/auth-env.ts).
- [Proxy web por HTTP](/apps/web/src/modules/identity/server/auth-proxy.ts).

Comprobado contra un Postgres 17 local con las 73 migraciones aplicadas:

- Suite de auth completa, incluidas las pruebas de integración (`TEST_DATABASE_URL`).
- Servidor real: health 200, registro, `get-session` por cookie y por Bearer con
  `actorId`, contraseña errónea 401, rate limit por IP reenviada con secreto, IP
  falsificada sin secreto ignorada, y salida limpia con `SIGTERM`.
- Stack local (`npm run dev`, web en `vp dev`): registro y `get-session` a través del proxy
  de web, llamada BFF autenticada hasta la API (200; anónima 401) y cabeceras
  `x-futrob-*` falsificadas descartadas por web.

No comprobado: el recorrido en navegador, despliegue en Railway o AWS, latencia de
`get-session` y la cabecera de IP del balanceador del proveedor elegido.
