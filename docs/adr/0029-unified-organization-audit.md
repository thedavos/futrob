# ADR-0029: Lectura unificada de auditoría de organización

- Estado: Aceptada
- Fecha: 2026-11-10
- Actualizado: 2026-11-11
- Relacionado: [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md), [ADR-0016](/docs/adr/0016-official-results-transactional-projection.md), [ADR-0028](/docs/adr/0028-competition-sanctions.md).
- Tarea: [AUDIT-01](https://app.notion.com/p/4147b204009a8100836cf82b4cd4fb62).

## Contexto e inventario inicial

El organizador necesita consultar quién hizo qué, cuándo y por qué. El historial ya existe
en varios propietarios, sin una consulta unificada ni pantalla. Revisar el código actual
cambia el inventario de carencias de la tarea:

| Acción sensible                               | Registro existente al iniciar AUDIT-01                    | Trabajo necesario                                        |
| --------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| Cambios de plan                               | `billing_plan_changes`, actor y motivo                    | Incorporar la lectura existente.                         |
| Cambios de roles y permisos                   | `authorization_audit_log`, actor, scope y motivo opcional | Incorporar sin duplicar escrituras.                      |
| Retiro de equipos y cierre de ronda suiza     | `swiss_round_actions`, actor, motivo y correlación        | Incorporar la lectura existente.                         |
| Sanciones y revocaciones                      | `competition_sanctions` de SANC-01                        | Incorporar ambas decisiones; esta PR depende de SANC-01. |
| Edición de enfrentamientos                    | `fixture_encounter_audit`                                 | Incorporar la lectura existente.                         |
| Selección, confirmación, disputa y aprobación | `official_selection_actions`                              | Incorporar acciones inmutables en orden temporal.        |

Las creaciones conservan actor y fecha en sus entidades; la publicación tiene una actividad
con el actor real. Las actividades de inscripción también conservan el actor real.
Generación de fixture, vínculo de club y altas de plantilla no conservan todos
los hechos necesarios del recorrido AC-E2E-001. La lectura no debe inventar esos actores ni
atribuir una decisión al jugador afectado.

## Decisión

`organizations` posee la consulta y el permiso nuevo `organizations.audit.read`
(`ORGANIZATION_PERMISSION.auditTrailRead`). El organizador lo recibe por defecto. Staff
requiere una concesión explícita y jugador/capitán no lo reciben. El permiso previo
`authorization.audit.read` conserva su significado en la gestión de miembros.

`OrganizationAuditReaderPort` devuelve entradas normalizadas. Cada propietario implementa
su fuente de lectura en `apps/api`, con filtro obligatorio por organización. La composición
combina fuentes por sus contratos públicos. Un adapter no consulta tablas de otro bounded
context y ningún package importa adapters de otra app.

La lectura global evalúa por lote el permiso de cada competición y pasa sus IDs permitidos
como alcance obligatorio a las fuentes. Cada fuente excluye competiciones denegadas antes
de paginar y conserva las entradas de organización sin competición. La consulta explícita
de una competición denegada devuelve 403. Los motivos legacy de `results` se redactan al
proyectarlos con la política pública de su contexto, sin reescribir el historial almacenado.

Cada fuente aplica competición, actor, acción y fechas antes del límite de página. La
composición mezcla las páginas por fecha descendente y un identificador estable que incluye
la fuente. El cursor conserva posición, organización y filtros. No concede autoridad y no
sustituye autorización. El mismo timestamp en milisegundos se usa en ordenación, comparación
y respuesta, para no saltar filas PostgreSQL con precisión de microsegundos.

La API expone únicamente `GET /organizations/{organizationId}/audit`, con páginas de 25
entradas por defecto y máximo 100. No ofrece edición ni borrado. Cada entrada incluye actor,
acción, motivo, fecha, correlación y objeto afectado. Los campos no registrados históricamente
son `null`; la UI distingue desconocido de sistema cuando existe esa información. Los enlaces
son rutas internas existentes y no exponen payloads EA, tokens ni datos privados de otra
organización.

Para los hechos ausentes se añade un registro append-only de operaciones de organización.
Los comandos de fixture, vínculo de club y altas de plantilla lo escriben junto con la mutación mediante la transacción existente,
siguiendo el patrón de composición de notificaciones. Las operaciones conservan el actor
conocido, tiempo y correlación reales. Las ejecuciones de sync se leen de los jobs durables,
sin inventar un actor. Los jobs pertenecen a la organización y pueden servir varias
competiciones; aparecen en la vista de organización, sin atribuirles una competición.
La clave de cada hecho evita duplicarlo al repetir una operación idempotente.
La correlación de petición no es una clave de idempotencia y puede agrupar hechos distintos.
El vínculo de club serializa por `Team` la lectura anterior, la mutación y su registro;
PostgreSQL mantiene el bloqueo hasta el cierre de la transacción. Dos vínculos idénticos
concurrentes producen un solo hecho, mientras los revínculos distintos conservan el suyo.
No se migran ni reescriben las tablas históricas.

La pantalla vive en los ajustes de organización y en la competición, con su contexto y
navegación correspondientes. Comparte la consulta y los filtros, conserva paginación y
muestra estados de vacío, vacío filtrado, carga, error y permiso denegado.

## Alternativas

- Un único `audit_logs` para todo exigiría migrar datos y cambiar escritores sin mejorar
  la consulta inicial. Se conservan los contratos de cada propietario.
- Un `UNION` que consulte tablas ajenas desde un adapter de organización rompe el límite
  de módulos. Las fuentes por propietario permiten filtrar y paginar sin ese acoplamiento.
- Reconstruir actores ausentes desde el estado actual del equipo falsearía la historia.
  Se conservan los datos disponibles y se registran los hechos ausentes hacia adelante.

## Consecuencias y límites

Cada consulta realiza una lectura acotada por fuente y mezcla como máximo una página por
fuente. Los lectores usan claves estables y filtros antes de paginar. Una nueva clase de
acción amplía la fuente de su propietario, sin convertir el visor en escritor de su dominio.
La consulta agrega historia operativa y proyecciones fieles de creación; no declara que el
estado mutable actual sea un historial completo de sus cambios anteriores.

El recorrido completo se verifica con operaciones nuevas. Los hechos históricos que nunca
se guardaron no se pueden recuperar con fidelidad. El visor no es un sistema de retención
legal ni cambia políticas existentes de borrado de una organización. La app nativa no recibe
una pantalla nueva en esta tarea; el SDK comparte el contrato de lectura.

## Evidencia de implementación

La comprobación de adapters PostgreSQL, permisos, recorrido y rutas HTTP se registra en
[la evidencia de AUDIT-01](/docs/evidence/audit-01/README.md). El estado de una decisión no
certifica despliegue ni integración con EA en producción.
