# Registro de decisiones de arquitectura

Actualizado: 2026-09-22.

Este índice distingue la **vigencia de una decisión** del **estado de su implementación**.
Aceptada no significa desplegada ni verificada de extremo a extremo. Las referencias
al código describen el checkout revisado, no certifican infraestructura de producción.

## Cómo leer y mantener el registro

- **Aceptada:** decisión vigente, aunque pueda tener implementación pendiente.
- **Reemplazada:** registro histórico; la decisión sucesora gobierna los cambios nuevos.
- **Propuesta:** alternativa todavía no aceptada, cuando se añadan decisiones en discusión.
- Las correcciones y consolidaciones conservan ID, fecha original y enlaces; incorporan
  fecha de actualización y explican qué decisión absorben. Los ADR históricos se conservan.
- Una decisión nueva recibe un ID nuevo. Las sustituciones enlazan en ambos sentidos;
  una sustitución parcial debe identificar qué parte sigue vigente.
- Cada ADR distingue contexto, decisión, consecuencias, alternativas y evidencia o brechas.
  Los comandos operativos se mantienen en los README; el contrato visual, en `design.md`.

## Decisiones

| ADR                                                                                                                           | Estado      | Implementación / alcance                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| [ADR-0001: Topología de despliegue y responsabilidades por runtime](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md) | Aceptada    | Topología y protocolo de jobs cableados; despliegues requieren verificación |
| [ADR-0002: Bounded contexts, packages y dependencias](/docs/adr/0002-hexagonal-feature-modules.md)                            | Aceptada    | Packages/DI existentes; algunos BC siguen como scaffolds                    |
| [ADR-0003: Ownership de Better Auth y D1](/docs/adr/0003-better-auth-and-d1-ownership.md)                                     | Reemplazada | Histórico → ADR-0015                                                        |
| [ADR-0004: Aislamiento de producto por alcance de aplicación](/docs/adr/0004-multi-tenant-d1-scoping.md)                      | Aceptada    | Scoping y resolución existentes; cobertura por flujo                        |
| [ADR-0005: Contrato HTTP privado, BFF y SDK](/docs/adr/0005-typed-private-api.md)                                             | Aceptada    | Contratos, SDK y generador existentes; sin gate explícito de drift OpenAPI  |
| [ADR-0006: Puerto genérico de game-data (EA como adapter)](/docs/adr/0006-game-data-provider-port.md)                         | Aceptada    | Modelo neutral y adapters existentes; soporte por proveedor                 |
| [ADR-0007: Observaciones de proveedor inmutables en Postgres](/docs/adr/0007-immutable-provider-observations.md)              | Aceptada    | Postgres/JSONB y deduplicación; retención/offload completos pendientes      |
| [ADR-0008: Notificaciones web y email en el MVP](/docs/adr/0008-notifications-web-and-email.md)                               | Aceptada    | Aceptada; implementación de notificaciones pendiente                        |
| [ADR-0009: Topología Cloudflare Workers](/docs/adr/0009-cloudflare-workers-topology.md)                                       | Reemplazada | Histórico → ADR-0001                                                        |
| [ADR-0010: Packages por bounded context y apps/api futura](/docs/adr/0010-bounded-context-packages.md)                        | Reemplazada | Histórico → ADR-0002                                                        |
| [ADR-0011: TaggedError para fallos esperados tipados](/docs/adr/0011-tagged-errors.md)                                        | Aceptada    | TaggedError y mapping por code existentes                                   |
| [ADR-0012: TanStack Query para server state de UI sobre `/api/v1`](/docs/adr/0012-tanstack-query-client-server-state.md)      | Aceptada    | Query en web; validación por flujo                                          |
| [ADR-0013: Egress a EA solo desde la API de producto](/docs/adr/0013-ea-egress-api-only.md)                                   | Aceptada    | Egress EA concentrado en API                                                |
| [ADR-0014: Tokens de diseño compartidos y UI nativa en móvil](/docs/adr/0014-shared-ui-tokens-and-mobile-ui.md)               | Aceptada    | Tokens compartidos y CSS generado; UI por plataforma                        |
| [ADR-0015: Autenticación, identidad y ownership de D1](/docs/adr/0015-auth-extraction.md)                                     | Aceptada    | Auth extraída; web proxy por service binding                                |
| [ADR-0016: Proyección transaccional de resultados oficiales](/docs/adr/0016-official-results-transactional-projection.md)     | Aceptada    | Resultado + estadísticas transaccionales; bracket y outbox pendientes       |
| [ADR-0017: Autorización contextual por capacidades](/docs/adr/0017-contextual-capability-authorization.md)                    | Aceptada    | Resolver contextual y matriz de pruebas existentes                          |

## Consolidación de septiembre de 2026

- ADR-0001 absorbe ADR-0009: topología, responsabilidades y circuito de sync.
- ADR-0002 absorbe ADR-0010: hexágonos, packages y dependencias públicas.
- ADR-0015 absorbe ADR-0003: auth, actores y ownership de D1.
- ADR-0016 y ADR-0017 formalizan consistencia transaccional y autorización contextual.

Quedan **14 decisiones vigentes y 3 registros reemplazados**. Los IDs y nombres de
archivo antiguos se conservan para no romper referencias. Para implementación nueva,
seguir el sucesor indicado, aunque un enlace histórico aún apunte al documento anterior.

## Documentos complementarios

[Arquitectura actual](/docs/architecture/overview.md) ·
[Límites de módulos](/docs/architecture/module-boundaries.md) ·
[Grafo de dependencias](/docs/architecture/dependency-graph.md) ·
[Packages y SDK](/docs/architecture/packages-and-sdk.md) ·
[Contrato de diseño](/design.md) · [Requisitos](/product/mvp-requirements.md).
