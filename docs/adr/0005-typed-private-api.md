# ADR-0005: Contrato HTTP privado, BFF y SDK

- Estado: Aceptada
- Fecha: 2026-07-10
- Actualizada: 2026-10-14
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Web y Expo necesitan contratos estables sin acoplar negocio a server functions de
TanStack. Además, el token de sesión del cliente y el secreto interno BFF/API tienen
significados distintos, aunque ambos viajen como Bearer.

## Decisión

`@futrob/api-contracts` posee schemas Zod, DTOs y errores de transporte `/api/v1`.
`@futrob/sdk` consume HTTP; no importa BC ni adapters. Zod permanece fuera del dominio.

```text
Web (cookie de sesión) → web BFF /api/v1 ─┐
Expo SDK (Bearer de sesión) → web BFF ────┤
                                        └→ SDK → API Node /api/v1 → casos de uso
BFF → AUTH_SERVICE (`get-session` devuelve el ActorId) para validar sesión
BFF → API con INTERNAL_JOB_SECRET + X-Futrob-Actor-Id
```

Las server functions pueden resolver SSR/redirects, pero consumen el mismo contrato
de producto. Los handlers de la API parsean input, invocan casos de uso y mapean DTOs;
no trasladan reglas de negocio al transporte.

El BFF deriva el actor de la sesión. El middleware de servicio de API exige el secreto
y el actor para operaciones de producto; los endpoints internos de jobs usan su
middleware específico. El secreto interno nunca se distribuye a web cliente o Expo.
La API Node no interpreta el token de sesión de Expo como secreto de servicio.

OpenAPI 3.1 se genera desde los schemas Zod del contrato, no se escribe a mano.
`@futrob/api-contracts` posee Zod y los artefactos `openapi.{json,yaml}` comprobados
en git. El cableado `createRoute` / `@hono/zod-openapi` vive en el adaptador HTTP de
`apps/api` (el package de contratos no depende de Hono). `npm run generate:openapi`
reconstruye los artefactos; `npm run openapi:check` en CI impide drift. Los cambios de
wire deben mantener schemas, SDK y consumidores alineados. No se ofrece una API de
terceros como compromiso de producto MVP.

## Consecuencias

- Autenticación, capacidades e interoperabilidad HTTP se prueban en sus respectivos límites.
- `Result`/TaggedError se mapean a respuestas seguras según
  [ADR-0011](/docs/adr/0011-tagged-errors.md).
- La caché interactiva del browser sigue [ADR-0012](/docs/adr/0012-tanstack-query-client-server-state.md).
- Cualquier cambio para que Expo llegue directamente a Node requiere una decisión
  explícita sobre validación de sesión y trust boundary, no solo cambiar una URL.

## Alternativas descartadas

Solo server functions; SDK que importe dominio; exponer el secreto interno al cliente;
promover el contrato privado a API pública de terceros por publicar su OpenAPI.

## Estado de implementación y evidencia

Hay generador desde Zod (`apps/api/scripts/generate-openapi.ts`), artefactos OpenAPI
comprometidos, recursos SDK y un paso de CI que regenera y exige `git diff --exit-code`
sobre `packages/api-contracts/openapi`. Los handlers HTTP de producto siguen en Hono
plano; el registro OpenAPI alimenta el documento, y la cobertura de rutas comprueba que
coincidan los paths.

- [Contratos](/packages/api-contracts/package.json), [registro OpenAPI](/apps/api/src/http/openapi/), [SDK](/packages/sdk/src/client.ts).
- [Autenticación de servicio](/apps/api/src/http/middleware/service-auth.ts).
- [Cliente nativo](/apps/mobile/src/modules/api/futrob-client.ts).
- [CI](/.github/workflows/ci.yml) (`npm run openapi:check`).
