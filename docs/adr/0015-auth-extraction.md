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
       cross-origin).
     - **Etapa 3 (hecha): web deja de servir auth.** El handler es proxy-only
       (503 si falta la var); el ownership del **schema de auth** se movió a
       `apps/auth` (`migrations/0001_better_auth_and_actors.sql`). Web conserva
       su propio lineage para tablas que le pertenecen (BFF rate limit). SSR/BFF
       resuelve la sesión con `getSession` + lookup de `identity_subjects`
       (`server/authenticated-request-actor.ts`). No provisiona actores.
4. **Schema y provisioner se copian, no se extraen al BC.** `drizzle-schema.ts`
   y `actor-provisioner.ts` viven en `apps/auth` (escritura) y en `apps/web`
   (lectura de sesión). Un test de lockstep falla si divergen. No van a
   `@futrob/identity`: ese paquete no exporta adapters ni schemas D1.

## Alternativas rechazadas

- **API Node aparte (estilo `apps/api`)**: auth es I/O ligero ideal para Workers;
  un runtime Node añade frío, ops y latencia sin beneficio.
- **Mantener embebido indefinidamente**: el acople de ciclo de despliegue entre
  auth y features de web crece con cada cliente adicional.
- **Extraer ya con cambio de cookies cross-origin**: se evita al mantener
  parallel run con misma D1; el cambio de dominio ocurre en etapa 2, con
  `Domain=.futrob.com` si aplica.

## Consecuencias

- Dos workers que comparten base D1: `apps/auth` escribe tablas de auth y
  actores; `apps/web` solo lee sesión e `identity_subjects`.
- Local dev comparte estado vía `wrangler dev --persist-to ../web/.wrangler/state`.
- La superficie pública de auth (`/api/auth/*` + bearer) queda congelada como
  contrato de plataforma: cambios requieren considerar ambos clientes.
- Etapa 2/3 requieren coordinar `BETTER_AUTH_URL`, `trustedOrigins` y CORS de la
  API de producto si el BFF deja de ser el único front HTTP.
