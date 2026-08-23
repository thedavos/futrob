# ADR-0005: API privada tipada

- Estado: Aceptada
- Fecha: 2026-07-10
- Actualizada: 2026-08-23
- Relacionado: [ADR-0012](/docs/adr/0012-tanstack-query-client-server-state.md)

## Contexto

El MVP tiene clientes web y mobile, por lo que necesita un contrato HTTP estable y no puede acoplar el negocio a server functions de TanStack.

## Decisión

`packages/api-contracts` es la fuente de schemas Zod de `/api/v1`, errores y eventos de transporte relevantes. Se genera OpenAPI/JSON Schema en CI cuando exista. El dominio no importa Zod. Server functions pueden optimizar la web; capacidades compartidas exponen el mismo use case vía API privada en el Worker.

No hay API pública de terceros en el MVP.

## Consecuencias

- Contratos versionados y testeables.
- `apps/mobile` consume `@futrob/sdk` sin reescribir ni importar el dominio.

## Alternativas rechazadas

- Solo server functions sin contrato HTTP.
- API pública documentada para terceros en el MVP.
