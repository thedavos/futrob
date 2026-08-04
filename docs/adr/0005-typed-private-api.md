# ADR-0005: API privada tipada

- Estado: Aceptada
- Fecha: 2026-07-10
- Actualizada: 2026-08-03
- Relacionado: [ADR-0012](/docs/adr/0012-tanstack-query-client-server-state.md)

## Contexto

Aunque el MVP es web-only, se necesita un contrato HTTP estable para clientes futuros y para no acoplar el negocio solo a server functions de TanStack.

## Decisión

`packages/api-contracts` es la fuente de schemas Zod de `/api/v1`, errores y eventos de transporte relevantes. Se genera OpenAPI/JSON Schema en CI cuando exista. El dominio no importa Zod. Server functions pueden optimizar la web; capacidades compartidas exponen el mismo use case vía API privada en el Worker.

No hay API pública de terceros en el MVP.

## Consecuencias

- Contratos versionados y testeables.
- Flutter u otros clientes pueden aparecer sin reescribir dominio.

## Alternativas rechazadas

- Solo server functions sin contrato HTTP.
- API pública documentada para terceros en el MVP.
