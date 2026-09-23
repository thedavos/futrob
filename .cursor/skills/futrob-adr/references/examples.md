# Ejemplos de criterio en Futrob

Estos ejemplos se basan en la revisión de septiembre de 2026. Antes de aplicarlos,
consulta el índice y el documento vigente; pueden existir sucesores o implementación
nueva. No uses esta referencia como inventario permanente del estado del producto.

## Nueva pantalla de estadísticas

**Solicitud:** «Crea una pantalla con KPIs y estados de carga».

Consulta los contratos de consulta de datos y UI aplicables, además de `design.md`.
Si usa SDK, Query y tokens existentes sin cambiar sus límites, implementa con las
skills de composición. No crees un ADR por añadir componentes, historias o una ruta.
Si la pantalla necesita nuevos datos, evalúa ese contrato por separado.

## Avance del bracket

**Solicitud:** «Tras confirmar el resultado, avanza al ganador».

Lee ADR-0016 y los límites de scheduling/results/statistics. Verifica la composición
de confirmación y anulación en `apps/api/src/di/create-modules.ts`. En la revisión de
referencia solo resultado + statistics participaban en ella; el avance estaba pendiente.

No supongas que emitir un evento completa la funcionalidad. Examina la alternativa
transaccional y la eventual, la concurrencia sobre destinos compartidos y la anulación
cuando existen partidos posteriores. Una ampliación puede registrar esas preguntas;
elegir consistencia eventual exige documentar la nueva garantía y su recuperación.

**Salida útil:** «ADR-0016 aplica; el límite actual no incluye avance. Scheduling será
dueño de la escritura. Queda por decidir cómo coordinarla y revertirla».

## Habilitación premium

**Solicitud:** «Un organizador con permiso puede acceder a analíticas premium».

Contrasta ADR-0017, el contrato HTTP y DEC-050. Distingue el permiso del actor de la
habilitación del plan. Si esa habilitación introduce una fuente de verdad y un contrato
nuevos, propone una decisión propia relacionada con autorización. No añadas pagos
automatizados por inferencia ni uses `statistics.read-own` como sustituto del acceso premium.

Si las notas históricas de una tarea exigen 402 pero su revisión deja 402/403 abierto,
registra la discrepancia; no conviertas un test sugerido en decisión aceptada.

## Portal público y caché

**Solicitud:** «Reutiliza el endpoint privado de rankings para espectadores y cachea».

Lee aislamiento y HTTP, y revisa la proyección pública. El cambio afecta la frontera
de acceso, los campos publicados y el almacenamiento compartido de respuestas. Evalúa
un ADR de publicación con DTO permitido, tratamiento de contenido no publicado,
cookies/idioma, frescura e invalidación. No basta retirar middleware o añadir headers.

La elección entre headers y Cache API puede quedar propuesta. No afirmes que
`publicId` debe ser distinto de `competitionId` si el producto aún no decidió su forma.

## Auth móvil marcado Done

**Solicitud:** «La tarea de refresh está Done; documenta que renueva el bearer».

Lee los criterios actuales y `session-lifecycle.ts`, `futrob-client.ts` y el contrato
auth. En la revisión de referencia, Done cubría SecureStore, sign-out y limpieza ante
401; la renovación silenciosa seguía bloqueada. Amplía la evidencia de ADR-0015 con
ese alcance. No declares rotación porque el título de la tarea contiene “refresh”.

## ADR histórico citado desde una rule

**Solicitud:** «Actualiza las referencias de arquitectura».

En el registro de referencia, 0001 absorbió 0009, 0002 absorbió 0010 y 0015 absorbió
0003. Sigue los enlaces para comprobar que esa relación continúa vigente. Corrige la
referencia activa a su sucesor; conserva los registros históricos y sus enlaces recíprocos.
No crees un ADR adicional ni renumeres los restantes para esta corrección.

## El código contradice una garantía

**Solicitud:** «El ADR promete rollback, pero el caso de uso devuelve Result.err».

Inspecciona el adapter transaccional y el punto donde se producen escrituras. Retornar
un error puede ser seguro antes de mutar; después de mutar puede confirmar cambios si
el wrapper solo revierte excepciones. Describe el camino concreto antes de concluir.
Si hay un incumplimiento, repórtalo o corrígelo según el alcance solicitado; no debilites
el ADR para que la inconsistencia deje de parecer un problema.
