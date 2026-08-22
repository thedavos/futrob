# ADR-0015: Extracción de auth a Worker independiente (`apps/auth`)

- Estado: Aceptada
- Fecha: 2026-08-22
- Relacionado: [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md) · [ADR-0003](/docs/adr/0003-better-auth-and-d1-ownership.md) · [ADR-0014](/docs/adr/0014-shared-ui-tokens-and-mobile-ui.md) · [`apps/auth/README.md`](/apps/auth/README.md)

## Contexto

Better Auth vive embebido en `apps/web` (TanStack Start sobre Workers): la ruta
catch-all `/api/auth/$` monta `auth.handler` con binding D1 propio. Con la
llegada del cliente móvil ([ADR-0014](/docs/adr/0014-shared-ui-tokens-and-mobile-ui.md))
y el soporte Bearer, el contrato `/api/auth/*` se volvió infraestructura de
plataforma consumida por dos clientes, no un detalle de la web.

## Decisión

1. **Nuevo deployable `apps/auth`** (`@futrob/auth`, nombre Worker `futrob-auth`):
   Worker Cloudflare vanilla (sin Hono por ahora) que expone `auth.handler`
   Better Auth en `/api/auth/*` + `GET /meta/health`.
2. **Plugins: solo `bearer()`.** Sin `tanstackStartCookies()` — es un puente para
   server functions de TanStack Start que no aplica en fetch plano; el core de
   Better Auth maneja cookies nativas en Request/Response.
3. **Estrategia de migración en 3 etapas**, sin big-bang:
   - **Etapa 1 (hecha): parallel run.** El worker comparte D1 (`futrob-app`) y
     secret con web; las sesiones son intercambiables entre orígenes. Web sigue
     sirviendo su auth embebida.
   - **Etapa 2 (hecha): clientes migran al worker.** Móvil apunta directo vía
     `EXPO_PUBLIC_FUTROB_AUTH_BASE_URL`; web hace **proxy same-origin**
     `/api/auth/* → FUTROB_AUTH_SERVICE_URL` (patrón BFF, sin CORS ni cookies
     cross-origin; con fallback embebido si la var no está definida).
   - **Etapa 3 (hecha): web deja de servir auth.** El handler es proxy-only
     (503 si falta la var); el ownership del **schema de auth** se movió a
     `apps/auth` (`migrations/0001_better_auth_and_actors.sql`). Web conserva
     su propio lineage para tablas que le pertenecen (BFF rate limit) y la
     lectura de sesión para SSR/BFF sigue resolviéndose contra D1 con un
     mirror read-only del schema (`server/authenticated-request-actor.ts`).
4. **Actor provisioning se replica, no se comparte por import**: los archivos de
   adaptador (`drizzle-schema`, `actor-provisioner`) viven duplicados en ambas
   apps durante la etapa 1; la deduplicación irá a `@futrob/identity` cuando el
   ownership se asiente.

## Alternativas rechazadas

- **API Node aparte (estilo `apps/api`)**: auth es I/O ligero ideal para Workers;
  un runtime Node añade frío, ops y latencia sin beneficio.
- **Mantener embebido indefinidamente**: el acople de ciclo de despliegue entre
  auth y features de web crece con cada cliente adicional.
- **Extraer ya con cambio de cookies cross-origin**: se evita al mantener
  parallel run con misma D1; el cambio de dominio ocurre en etapa 2, con
  `Domain=.futrob.com` si aplica.

## Consecuencias

- Dos workers que comparten base D1: las reglas de escritura quedan definidas por
  tabla (auth tables: dueño transitorio doble hasta etapa 3; resto: sin acceso).
- Local dev comparte estado vía `wrangler dev --persist-to ../web/.wrangler/state`.
- La superficie pública de auth (`/api/auth/*` + bearer) queda congelada como
  contrato de plataforma: cambios requieren considerar ambos clientes.
- Etapa 2/3 requieren coordinar `BETTER_AUTH_URL`, `trustedOrigins` y CORS de la
  API de producto si el BFF deja de ser el único front HTTP.
