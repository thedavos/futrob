# ADR-0002: Bounded contexts, packages y dependencias

- Estado: Aceptada
- Fecha: 2026-07-10
- Actualizada: 2026-09-22
- Reemplaza: [ADR-0010](/docs/adr/0010-bounded-context-packages.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Las capacidades de producto deben evolucionar sin mezclar reglas competitivas,
observaciones de proveedor, persistencia y presentación. La API y las herramientas
locales necesitan reutilizar el dominio sin depender del árbol de web.
Esta revisión incorpora la decisión de packages de ADR-0010.

## Decisión

Cada BC vive en `packages/<context>/src/{domain,application}` y publica únicamente su
contrato por `src/index.ts`. Los ports propios del contexto viven en `domain/ports`.
El package exporta use cases, entidades, tipos y ports; no exporta adapters, schemas
SQL, clientes de red ni componentes de UI.

| Capa                           | Ubicación / dependencia                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| Dominio                        | BC propietario; políticas y vocabulario sin framework, Zod ni I/O |
| Aplicación                     | BC propietario; orquesta dominio y ports                          |
| Adapters de producto y bridges | `apps/api/src/adapters/<context>`                                 |
| Composición de producto        | `apps/api/src/di`                                                 |
| HTTP y DTO mapping             | `apps/api/src/http`, contratos en `packages/api-contracts`        |
| Web BFF/presentación           | `apps/web/src/modules/<context>` y rutas existentes               |
| Auth e infraestructura Worker  | App propietaria según ADR-0001/0015                               |
| Presentación nativa            | `apps/mobile`; SDK y tokens, sin implementaciones de BC           |

La separación `scheduling ≠ game-data ≠ results ≠ statistics ≠ analytics` es obligatoria.
El [mapa de módulos](/docs/architecture/module-boundaries.md) define el resto de ownership.

Cross-context se permite mediante APIs públicas de packages, ports/bridges o eventos
versionados. Las dependencias declaradas pueden reutilizar tipos públicos; no pueden
acceder a internals, adapters o tablas ajenas. Un bridge adapta el contrato del
consumidor y se conecta en la composición de la app.

`@futrob/shared-kernel` contiene semántica transversal: IDs, Result/TaggedError y ports
como ClockPort, IdGeneratorPort, TransactionPort, EventPublisherPort y AuthorizationPort.
Antes de agregar otro port, se busca uno equivalente. Vocabulario específico de un BC
permanece en ese BC. Los helpers de tiempo compartidos se reutilizan desde el kernel.

Las facades web pueden reexportar contratos públicos, pero no restablecen composición
de producto en Workers. EA egress se rige por [ADR-0013](/docs/adr/0013-ea-egress-api-only.md).

## Consecuencias

- Los tests de dominio/aplicación usan ports fake y no requieren infraestructura.
- Cada nuevo contrato público y dependencia del grafo exige revisión de ownership.
- Una feature no requiere un nuevo package si pertenece a un contexto existente.
- Eventos declarados no implican entrega: ver [ADR-0016](/docs/adr/0016-official-results-transactional-projection.md).

## Alternativas descartadas

Un módulo único `matches`; packages globales por capa técnica; dominio dentro de web
consumido por aliases; contenedor DI reflectivo global; adapters exportados por BC.

## Estado de implementación y evidencia

La extracción de BC y la composición API están implementadas. Algunos BC del catálogo
siguen siendo scaffolds; tener un package no prueba que sus casos de uso existan.

- [Packages y SDK](/docs/architecture/packages-and-sdk.md).
- [Grafo de dependencias](/docs/architecture/dependency-graph.md).
- [Composición API](/apps/api/src/di/create-modules.ts).
- [Ejemplo de port consumidor](/packages/results/src/domain/ports/provider-match-reader.port.ts)
  y [bridge](/apps/api/src/adapters/results/bridges.ts).
