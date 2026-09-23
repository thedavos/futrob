---
name: futrob-adr
description: Consultar, evaluar y mantener los ADR de Futrob al revisar decisiones de arquitectura, impactos de tareas o discrepancias entre código y documentación. Permite ampliar, proponer y sustituir decisiones conservando su historia; no exige un ADR para cada cambio de implementación.
---

# ADR de Futrob

Usa el registro para explicar qué decisión gobierna el cambio, qué evidencia existe y
qué sigue pendiente. El resultado puede ser aplicar una decisión existente sin editar
documentación. Este skill contiene el procedimiento; las decisiones viven únicamente
en [docs/adr/README.md](../../../docs/adr/README.md) y sus documentos.

## Elegir el alcance

| Solicitud | Resultado esperado |
| --- | --- |
| «¿Qué ADR aplica?» | Decisiones vigentes relevantes y efecto sobre la tarea |
| «¿Estas tareas afectan la arquitectura?» | Impactos con evidencia, clasificación y cuestiones pendientes |
| «Actualiza/amplía el ADR» | Edición focalizada, estado correcto e índice coherente |
| «Propón una arquitectura» | Alternativas y recomendación; propuesta si no hay decisión tomada |
| «Fusiona/elimina ADR redundantes» | Consolidación con trazabilidad y sucesores explícitos |

Una solicitud de revisión no autoriza por sí sola modificaciones en Notion ni cambios
de código. Si el usuario ya pidió actualizar documentos o tareas, realiza ese trabajo
sin volver a pedir permiso. No conviertas esta guía en una aprobación adicional para
correcciones rutinarias. Si falta una decisión material, documenta la incertidumbre y
continúa las partes independientes; pregunta solo si impide completar lo solicitado.

## Consultar con contexto

1. Lee el índice y selecciona ADR por responsabilidad afectada, no por coincidencia
   aislada de palabras. Sigue las relaciones de reemplazo hasta la decisión vigente.
   No cargues todos los ADR para una consulta acotada.
2. Lee los requisitos, criterios y vocabulario relevantes en `product/`. Consulta
   `docs/architecture/` para ownership y dependencias, y `design.md` para UI.
3. Contrasta las afirmaciones importantes con el código: contrato público, composición
   de dependencias, adapter y prueba que sustenta la garantía. Una interfaz o un evento
   declarado no prueban que su implementación esté conectada.
4. Si el encargo incluye tareas de Notion, lee sus criterios, notas y actualizaciones
   recientes. Distingue investigación histórica de alcance actual. Cita la página;
   no interpretes `Done` o una mención de PR merged como prueba del checkout local.
5. Expón cualquier diferencia entre decisión vigente, implementación comprobada y
   objetivo de producto. No ocultes la diferencia reescribiendo el ADR para ajustarlo
   automáticamente al código.

Las instrucciones vigentes del usuario gobiernan el encargo. Dentro del proyecto,
cada fuente tiene una función: producto define comportamiento, ADR registra decisiones,
código evidencia implementación y pruebas evidencian garantías concretas. La fecha más
reciente no resuelve por sí sola un conflicto entre fuentes.

## Clasificar y actuar

Lee [decision-guide.md](references/decision-guide.md) para decidir entre aplicar,
corregir, ampliar, proponer o sustituir. Antes de editar, identifica:

- El problema y el comportamiento observable que motiva la decisión.
- Los límites afectados: ownership, runtime, persistencia, acceso, consistencia o wire.
- La decisión existente que se conserva y el fragmento que cambiaría.
- La evidencia de implementación y las alternativas todavía abiertas.

Para crear o reestructurar un ADR, usa
[adr-template.md](references/adr-template.md). Para situaciones ambiguas, consulta
[examples.md](references/examples.md); sus ejemplos ilustran el método y no sustituyen
el contenido actual de los ADR.

Conserva IDs, fechas originales y archivos históricos. Registra una fecha de actualización
cuando cambie contenido sustantivo. Una decisión nueva recibe un ID disponible después
de inspeccionar el registro, incluidos los documentos todavía no indexados. Actualiza
el índice y las relaciones de reemplazo en ambos sentidos.

No marques una alternativa como aceptada solo porque redactaste la propuesta. Tampoco
rebajes una decisión vigente porque su implementación esté incompleta. Al formalizar
una práctica existente, explica la evidencia y el alcance autorizado para aceptarla.

## Mantener las fuentes relacionadas

- Ajusta overview, límites de módulos o grafo solo si la decisión modifica sus contratos.
- Mantén instrucciones operativas en README; requisitos de producto en `product/`;
  el contrato visual en `design.md`. Enlaza esas fuentes en lugar de copiarlas.
- Si se autoriza actualizar Notion, lee primero página y schema. Haz cambios focalizados,
  conserva referencias y distingue research histórico de revisión actual. No cambies
  el estado de ejecución solo por completar una revisión documental. Verifica lo guardado.
- Si no hay acceso a Notion, completa la parte local y señala qué contraste externo falta;
  no hagas depender una consulta local de un plugin que puede no estar instalado en Cloud.
- Para implementar la decisión, usa
  [futrob-hexagonal-module](../futrob-hexagonal-module/SKILL.md); este skill no sustituye
  su guía de código ni autoriza despliegues.

## Verificar y entregar

Comprueba que los IDs son únicos, los enlaces resuelven, los sucesores existen y no
hay ciclos de reemplazo. Verifica también que el índice distingue vigencia e implementación
y que una sección pendiente no se presenta como una decisión aceptada.

En Markdown de `docs/` y `product/`, usa enlaces desde la raíz del repositorio. Dentro
del skill, usa rutas relativas válidas. Ejecuta `git diff --check` y las comprobaciones
documentales del proyecto; para cambios solo documentales, no declares pruebas funcionales
nuevas ni inventes evidencia de ejecución. Si cambió código, valida sus límites afectados.

Entrega las decisiones consultadas o modificadas, el motivo, las verificaciones y las
cuestiones que continúan abiertas. Una revisión de tareas puede usar una tabla breve
«tarea → ADR → impacto → acción», con enlaces verificables. No impongas esa tabla para
una corrección sencilla.
