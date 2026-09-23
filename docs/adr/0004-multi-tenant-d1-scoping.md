# ADR-0004: Aislamiento de producto por alcance de aplicación

- Estado: Aceptada
- Fecha: 2026-07-17
- Actualizada: 2026-09-22
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Los datos privados de organizaciones, competiciones y equipos requieren aislamiento.
La decisión original aplicaba scoping sobre D1. Producto ahora vive en Postgres: se
mantiene el aislamiento explícito por aplicación sin depender de Postgres RLS.
Auth/actores y rate limits BFF permanecen en D1 según
[ADR-0015](/docs/adr/0015-auth-extraction.md).

## Decisión

- La identidad proviene de la sesión validada; los identificadores enviados por el
  cliente no prueban pertenencia ni permiso.
- Casos de uso protegidos aplican capacidades y validan relaciones de scope según
  [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md).
- Las consultas y escrituras tenant-scoped en adapters de producto filtran por
  `organizationId` y el alcance más específico necesario. Un ID predecible o único
  no reemplaza el control de ownership.
- Los flujos personales se autorizan por actor/perfil propietario; no se inventa una
  membresía organizacional para consultar datos propios.
- Registros compartidos de proveedor tienen su propio ownership en game-data. Poder
  observar un recurso externo no concede acceso a datos privados de una organización.
- El portal público consume proyecciones sanitizadas y condiciones explícitas de publicación.
- Los clientes no acceden directamente a bases de datos ni reciben secretos de servicio.

## Consecuencias

Los adapters y las comprobaciones de alcance son parte de la barrera de seguridad.
Se requieren pruebas de dos organizaciones y de IDs cruzados para los límites afectados.
La ausencia de RLS es una elección actual, no una afirmación de que Postgres no lo soporte.

## Alternativas descartadas

Ocultar controles como autorización; roles declarados por el cliente; base/schema por
tenant en el MVP; depender exclusivamente de RLS en lugar de permisos de producto.

## Estado de implementación y evidencia

Existen adapters Postgres y resolución contextual. La cobertura se verifica por flujo;
este ADR no declara que todas las queries hayan sido auditadas.

- [Resolución contextual](/apps/api/src/adapters/authorization/contextual-authorization.adapter.ts).
- [Matriz de autorización](/apps/api/src/adapters/authorization/rbac-matrix.test.ts).
- [Límites de módulos](/docs/architecture/module-boundaries.md).
