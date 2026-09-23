# Guía de decisión

## ¿Hace falta un ADR?

Un ADR captura una elección duradera con consecuencias y alternativas relevantes.
Cambiar ownership entre BC, una frontera de confianza, un runtime, un contrato de
consistencia o una fuente de verdad suele justificarlo. Añadir archivos, endpoints o
dependencias no es suficiente por sí solo: identifica la elección que introducen.

| Hallazgo | Acción | Evidencia mínima |
| --- | --- | --- |
| La tarea cumple una decisión vigente | Aplicar; no crear ADR | Decisión y límites que gobiernan la implementación |
| Ruta, nombre o estado de implementación obsoleto | Corregir documentación | Símbolo/ruta actual y alcance real |
| Nuevo caso dentro del mismo contrato | Ampliar | Regla conservada, caso nuevo y consecuencias |
| Elección independiente que afecta varios límites | Nuevo ADR | Contexto, alternativas y razón de la elección |
| Nueva elección incompatible con una decisión vigente | Nuevo ADR y sustitución total/parcial | Contrato anterior, cambio y migración |
| Duplicación sin cambio de decisión | Consolidar | Documento destino y contenido absorbido |
| Divergencia entre código y decisión | Investigar y describir | Ambos lados; no suponer cuál debe cambiar |
| Alternativa sin resolver | Propuesta o sección pendiente | Opciones, impacto y criterio para decidir |

Una ampliación no debe esconder un cambio incompatible. Por ejemplo, reemplazar
atomicidad por consistencia eventual cambia una garantía; no es una actualización
cosmética del estado de implementación.

## Separar tres dimensiones

**Vigencia:** usa los estados definidos en el índice actual. Aceptada, Propuesta y
Reemplazada describen la decisión, no el avance de una tarea.

**Implementación:** indica lo observado, por ejemplo contrato declarado, adapter
existente, composición conectada o consumer pendiente. Acota la afirmación al checkout
revisado; no la extrapoles a producción.

**Verificación:** distingue una prueba existente de una prueba ejecutada. Un fake
puede comprobar una regla de negocio sin probar rollback Postgres, aislamiento entre
procesos, entrega de Queue ni integración con EA.

Ejemplo de redacción: «Decisión aceptada; composición Postgres presente; no se ejecutó
una prueba de concurrencia en esta revisión». Evita «implementado y garantizado» si
solo encontraste un port o leíste un test.

## Resolver discrepancias

1. Identifica el conflicto exacto: afirmación, archivo/página y evidencia contraria.
2. Busca sucesores, secciones pendientes y notas de migración antes de asumir deriva.
3. Revisa el cableado. En Futrob, un EventPublisherPort no acredita outbox y un
   Result.err retornado no acredita rollback: inspecciona el adapter y su composición.
4. Clasifica la diferencia: documentación atrasada, implementación parcial, incumplimiento
   o propuesta todavía no aceptada. Si no puedes distinguirlas, indícalo.
5. Corrige lo que el encargo autoriza. No elimines una garantía para encubrir un fallo
   ni implementes una migración extensa a partir de una consulta documental.

Si una decisión material requiere elección del usuario, presenta opciones concretas
con su efecto. No solicites confirmación para arreglar enlaces, actualizar evidencia
o seguir una decisión ya autorizada.

## Ampliar sin confundir estados

Mantén visible qué permanece aceptado. Una sección de evolución puede describir un
objetivo y sus preguntas pendientes dentro de un ADR aceptado, siempre que especifique
que las alternativas no están aceptadas ni implementadas. Si esa sección adquiere una
decisión propia o reemplaza garantías, sepárala en un ADR y enlaza la relación.

Incluye consecuencias observables: qué sucede ante fallo parcial, quién reintenta,
qué ve el cliente o qué escrituras se revierten. Evita decisiones como «usar eventos»
sin persistencia, idempotencia y recuperación cuando de ellas depende la garantía.

## Fusionar y sustituir

- Elige un documento canónico por coherencia de alcance; no por tener el ID mayor.
- Conserva la fecha original y registra la actualización. Explica qué contenido absorbe.
- Marca los registros totalmente sustituidos como Reemplazada y enlaza el sucesor.
  El sucesor identifica los registros reemplazados; conserva el texto antiguo como histórico.
- En una sustitución parcial, identifica las secciones sustituidas y las todavía vigentes
  tanto en ambos documentos como en el índice. No marques todo como reemplazado si
  aún contiene una decisión vigente sin sucesor.
- Corrige referencias activas cercanas para nuevas implementaciones. Mantén enlaces
  históricos útiles y no renumeres el registro para rellenar huecos.
- Busca referencias antes de retirar archivos. La limpieza habitual conserva el registro
  histórico; si el usuario pide eliminación física explícita, evalúa los enlaces y el
  contenido que debe preservarse dentro de ese alcance.

## Tareas externas

Una tarea puede combinar criterios actuales y research anterior al último merge.
Lee ambos. Un requisito pendiente no invalida automáticamente el ADR vigente y un
estado Done no demuestra que se completaron todos los puntos históricos.

Cuando actualices tareas por encargo, conserva su historia, añade una revisión fechada
y corrige referencias erróneas donde aparecen. Usa menciones nativas para otras páginas
Notion cuando la herramienta lo permita. No conviertas alternativas abiertas en criterios
cerrados: «decidir 402 frente a 403» no equivale a exigir 402 en un test.
