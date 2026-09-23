# ADR-0015: Autenticación, identidad y ownership de D1

- Estado: Aceptada
- Fecha: 2026-08-22
- Actualizada: 2026-09-22
- Reemplaza: [ADR-0003](/docs/adr/0003-better-auth-and-d1-ownership.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Better Auth estuvo embebido en web. Al compartir autenticación entre web y Expo se
separó su ciclo de despliegue, conservando sesiones y D1. Esta revisión consolida el
ownership de ADR-0003 y documenta el resultado de la extracción, no un parallel run vigente.

## Decisión

1. `apps/auth` es la autoridad de credenciales, sesiones, cuentas y verificaciones.
   Ejecuta Better Auth en un Worker independiente con `/api/auth/*`, `bearer()` y
   `/meta/health`. No necesita `tanstackStartCookies()` en su handler fetch.
2. Futrob posee Actor e IdentitySubject. `(provider, subject)` resuelve un ActorId
   estable. Solo auth provisiona actores y mappings, de forma idempotente antes de
   emitir la sesión. La autorización de negocio sigue
   [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md).
3. Web hace proxy same-origin vía `AUTH_SERVICE`. SSR/BFF obtiene la sesión mediante
   `get-session` y resuelve `identity_subjects` en D1; no consulta tablas session/user
   ni vuelve a provisionar actores. Sin binding válido no hay fallback a auth embebida.
4. Expo usa auth directamente y guarda el token de sesión en SecureStore. El token de
   sesión se presenta al BFF; es distinto del secreto interno hacia Node, según
   [ADR-0005](/docs/adr/0005-typed-private-api.md).
5. `apps/auth/migrations` es la única historia de la D1 compartida, incluyendo tablas
   BFF. Auth escribe sus tablas/actores; web consulta mappings y gestiona sus rate limits.
   Organizaciones, memberships de producto y onboarding de producto viven en la API/Postgres.
6. El schema Drizzle duplicado en web/auth se mantiene mediante verificación de lockstep;
   duplicar tipos no otorga a web propiedad sobre credenciales o sesiones.
7. Rate limits auth persisten en D1 y usan `CF-Connecting-IP`; el proxy conserva la IP
   según su contrato de confianza. Secretos, cookies y tokens no se registran en logs.

## Consecuencias

- La sesión demuestra identidad; no incorpora autoridad de roles editable por el cliente.
- Las entidades de negocio no referencian tablas Better Auth ni usan su plugin de organizaciones.
- Ambos Workers requieren configuración coherente de secreto/cookies. Desarrollo comparte
  D1 en `apps/web/.wrangler/state`; se sigue AGENTS.md para `--persist-to`.
- Cambios de origen/cookies/Bearer requieren comprobar web, SSR y Expo. El modo de
  despliegue no prueba por sí solo salud de auth ni la ausencia de fugas.

## Alternativas descartadas

Mantener auth embebida indefinidamente; segundo runtime Node para auth sin necesidad;
plugin de organizations de Better Auth como negocio; cambio simultáneo de servicio y
cookies cross-origin durante la extracción; roles cliente como autorización.

## Historia de migración

Se completaron tres etapas: Worker paralelo sobre D1 compartida, migración de clientes
al Worker y retirada del handler embebido. La etapa paralela explica la compatibilidad
histórica; hoy web es proxy. [ADR-0003](/docs/adr/0003-better-auth-and-d1-ownership.md)
conserva el contexto inicial.

## Estado de implementación y evidencia

La separación está implementada. La verificación de un despliegue concreto es independiente.

- [Worker auth](/apps/auth/src/index.ts).
- [Proxy web](/apps/web/src/modules/identity/server/auth-proxy.ts).
- [Actor autenticado](/apps/web/src/modules/identity/server/authenticated-request-actor.ts).
- [Lifecycle nativo](/apps/mobile/src/modules/identity/session-lifecycle.ts).
- [Operación de auth](/apps/auth/README.md).
