---
name: futrob-sdk
description: Integrar, depurar o ampliar @futrob/sdk para consumir la API de Futrob desde web/BFF, React Native/Expo y CLI. Usar al implementar llamadas de producto, contratos HTTP, autenticación del cliente, permisos contextuales, errores, cancelación, reintentos o pruebas del SDK.
---

# SDK de Futrob

Usar `@futrob/sdk` como cliente HTTP tipado de la API de producto. Reutilizar sus
recursos, contratos y transporte; mantener las reglas de negocio en el bounded
context que las posee. El SDK conecta clientes con `/api/v1`: no implementa casos
de uso, no accede a bases de datos y no llama directamente a EA.

## Elegir el alcance

Leer solo la referencia necesaria para la tarea:

| Tarea | Referencia |
| --- | --- |
| Consumir un recurso desde web, BFF, móvil o CLI; resolver permisos y onboarding | [Consumo por entorno](references/consumption.md) |
| Manejar errores, correlación, cancelación, timeout o reintentos | [Transporte y recuperación](references/transport.md) |
| Añadir/cambiar un método, contrato o prueba | [Extensión y validación](references/extending.md) |

Si cambia comportamiento de negocio, aplicar también
[futrob-hexagonal-module](../futrob-hexagonal-module/SKILL.md). Para una pantalla,
usar [create-page](../create-page/SKILL.md) y `design.md`. Esta skill no sustituye
las reglas de presentación ni justifica reestructurar módulos ajenos a la tarea.

## Fuentes de verdad

Los caminos de código siguientes son relativos a la raíz del repositorio.
Verificar la implementación actual antes de copiar firmas o payloads:

| Pregunta | Fuente |
| --- | --- |
| ¿Qué se puede importar? | `packages/sdk/src/index.ts`, `packages/sdk/package.json` |
| ¿Qué recursos tiene una instancia? | `packages/sdk/src/client.ts` |
| ¿Cuál es la firma, ruta y schema de una operación? | `packages/sdk/src/resources/<recurso>.ts` |
| ¿Qué DTO, enum, opcionalidad o respuesta acepta? | `packages/api-contracts/src/v1/` y sus exports públicos |
| ¿Cómo se autentica y autoriza realmente el endpoint? | Ruta correspondiente en `apps/web/src/routes/api/v1/` y `apps/api/src/http/routes/` |
| ¿Cómo se transporta y representa un error? | `packages/sdk/src/http.ts`, `errors.ts`, `wire-body.ts` |
| ¿Cómo probar la petición? | `packages/sdk/src/testing/` y tests del recurso |

El contrato TypeScript no demuestra que una ruta esté expuesta en todos los hosts.
Comprobar también el BFF y sus bindings cuando el cliente entre por web.

## Flujo de trabajo

1. **Identificar consumidor y autoridad de sesión.** Determinar si la llamada sale
   del navegador, BFF/SSR, móvil o CLI. Reutilizar la fábrica de ese entorno.
   `baseUrl` debe apuntar al host correcto e incluir `/api/v1` una sola vez.
2. **Buscar la operación existente.** Revisar `client.ts`, el recurso y el schema.
   No inventar nombres a partir de una URL ni duplicar una llamada con `fetch`
   cuando ya existe el método público adecuado.
3. **Preparar entradas con tipos públicos.** Importar DTOs/schemas desde
   `@futrob/api-contracts`. Pasar identificadores reales del contexto y respetar
   diferencias entre campo ausente, `null` y cadena vacía. No usar casts para
   hacer pasar un payload que no cumple el contrato.
4. **Consumir la respuesta parseada.** Los métodos devuelven DTOs, no `Response`.
   No llamar `.json()` ni envolver respuestas en formas inventadas. Adaptar a
   view models en la app, sin volver a escribir reglas de negocio.
5. **Resolver permisos y estado.** Consultar `EffectiveAccess` con el scope de la
   operación; mantener acciones protegidas ocultas o deshabilitadas mientras no
   haya una decisión permitida. Gestionar carga, ausencia, error y recuperación.
6. **Coordinar concurrencia y efectos.** Cancelar o descartar respuestas obsoletas;
   impedir doble envío; invalidar consultas y permisos afectados tras una mutación.
   No asumir idempotencia por usar el SDK.
7. **Validar el límite cambiado.** Probar método/ruta/payload/respuesta cuando cambia
   el SDK, y consecuencias observables cuando cambia el consumidor. Ejecutar los
   comandos relevantes de la referencia de extensión y comunicar límites de evidencia.

## Límites obligatorios

- Importar desde `@futrob/sdk`, `@futrob/sdk/testing` y `@futrob/api-contracts`.
  Los consumidores no importan `packages/sdk/src/*` ni el helper interno `apiPath`.
- El SDK usa contratos wire y APIs de plataforma compatibles con sus consumidores.
  No incorporar React, Expo, TanStack Query, Workers bindings, secretos, SQL,
  adapters de apps o lógica de dominio al paquete.
- La autenticación Better Auth (`/api/auth/*`) pertenece a los clientes de auth.
  `client.identity` gestiona onboarding de producto; no ofrece login o refresh.
- `INTERNAL_JOB_SECRET` y `X-Futrob-Actor-Id` son mecanismos de confianza del
  servidor. No introducirlos en bundles web/native ni aceptar un actor arbitrario
  del formulario como identidad confiable del BFF.
- El SDK no persiste sesión ni decide cerrar sesión, redirigir o mostrar toasts.
  Esas consecuencias pertenecen al límite de la app. Reutilizar sus manejadores.
- No deducir permisos de `role === "admin"`, de membresías o de la presencia de
  un ID. La UI consume decisiones de `EffectiveAccess`; la API vuelve a autorizar.
- No usar métodos de `/internal/*` como atajo desde una pantalla porque aparezcan
  en el cliente. Verificar su audiencia, autenticación y permisos de servidor.
- No convertir errores de contrato, permisos o red en una lista vacía o éxito
  aparente. Una respuesta `204` solo representa ausencia si ese método lo define.
- No registrar tokens de sesión/invitación, headers de autorización ni cuerpos
  completos con datos privados. Correlacionar con `requestId` y códigos seguros.

## Mapa de recursos

Este mapa orienta la búsqueda; las firmas vigentes viven en cada archivo del SDK.

| Recurso | Responsabilidad |
| --- | --- |
| `meta` | Ping y salud de la API |
| `identity` | Estado, progreso, inspección de invitación y finalización de onboarding |
| `organizations` | Membresías, organizaciones, disponibilidad de nombre, destinos e invitaciones |
| `competitions` | Competición, participantes y operaciones expuestas por su recurso |
| `players` | Perfil personal, cuentas de juego, clubes personales, equipos y equipo activo |
| `teams` | Equipos; namespaces `players`, `rosters`, `rosterInvitations`, `externalClubs` |
| `gameData` | Observaciones de clubes/proveedor; también operaciones internas de sync y salud |
| `encounters` | Operaciones de encuentros expuestas por la API |
| `results` | Selección, confirmación y operaciones de resultados |
| `statistics` | Consultas estadísticas; distinguir vistas personales/proveedor de proyecciones oficiales |
| `authorization` | Acceso efectivo, grants y asignaciones de roles |

Conservar aliases existentes de `teams` al extenderlo. Un club asociado al jugador
no equivale al vínculo EA de un equipo; una invitación a competición no equivale a
una invitación de plantilla. Sincronizar datos de EA no oficializa resultados.

## Cierre de la tarea

Informar qué consumidor/recurso cambió, qué contrato se respetó o amplió y qué
validaciones se ejecutaron. Distinguir pruebas con `mockFetch` de una integración
real con auth, BFF, API, persistencia y EA. No atribuir al SDK garantías que dependen
de la configuración o de los casos de uso del servidor.
