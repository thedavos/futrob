# Propuesta: expiración y escalada de reprogramaciones (DEC-032 / DEC-033)

**Estado:** propuesta pendiente de validación. No es una decisión aprobada. No hay runtime de
expiración ni de escalada. No actualiza [open-decisions.md](/product/open-decisions.md).

**Dueña:** `@futrob/scheduling`.
**No dueña:** `@futrob/results`, el plazo DEC-021, ni la antelación mínima. Ese tema vive en
`product/proposals/reschedule-minimum-notice.md`, en el otro thread. Este PR no lo crea ni lo
edita.

## En una frase

Si nadie completa las aprobaciones a tiempo, la solicitud no se acepta sola. Pasa a `escalated`.
El organizador elige fecha, conserva el horario o declara la intención de walkover. El silencio
nunca acepta.

## Por qué hace falta

Hoy la negociación existe ([scheduling-reschedule-negotiation.md](/docs/architecture/scheduling-reschedule-negotiation.md)).
Una solicitud `open` puede quedarse abierta para siempre. Los estados `expired` y `escalated` ya
están en el tipo, pero ningún comando los escribe. DEC-032 y DEC-033 piden un plazo y un cierre
operativo. El default de [open-decisions.md](/product/open-decisions.md) dice «12 horas o según
reglamento». Esa frase se evalúa aquí. No se trata como regla ya aprobada.

DEC-021 (confirmación rival de resultados) es otra política. Vive en results. Dura 24 horas. Escala
a `organizer_review`. No comparte constante, campo, job ni estado con esta propuesta. El texto
vigente de DEC-021 que menciona «12 horas» y `escalated` solo apunta al default de DEC-032. No
valida DEC-032.

## Qué hay hoy (observado)

- `ScheduleChangeRequest.status` admite `open`, `accepted`, `rejected`, `cancelled`, `expired` y
  `escalated`. Los comandos de negociación solo operan si el estado es `open`.
- `ScheduleChangeProposal` guarda `createdAt` y no guarda deadline.
- Las reglas de etapa exponen `allowRescheduling`, `maxReschedulesPerTeam`,
  `minimumRescheduleNoticeHours`, `requiresOpponentApproval` y `requiresOrganizerApproval`.
  No hay campo de expiración de propuesta.
- `minimumRescheduleNoticeHours` ya existe y su default de draft es 12. Es la antelación mínima,
  no este plazo. Otro thread es dueño de esa semántica. Esta propuesta no lo reutiliza.
- Una solicitud «activa» es hoy `status === "open"`. Bloquea otra solicitud incompatible.
- Aceptar el último consentimiento requerido aplica el horario en la misma transacción. No existe
  «aprobado sin aplicar».
- No hay tipo de `OfficialResult` por walkover. Un resultado oficial exige hoy un
  `ProviderMatch` por slot. `operator_resolution` existe como base de aprobación, no como walkover.

## Forma de datos

Antes de la regla, la unidad que vence es esta:

| Elemento | Contrato propuesto |
| --- | --- |
| Qué vence | La ventana de respuesta de la **propuesta vigente**. No un reloj aparte de la solicitud. |
| Ancla | `createdAt` de esa propuesta, según el reloj de la API (`ClockPort`). |
| Duración | Horas enteras exactas en milisegundos. Sin calendario y sin zona horaria. 12 h = 43 200 000 ms. |
| Deadline `D` | Se calcula y se guarda en UTC al **crear** esa propuesta (solicitud nueva o contrapropuesta). |
| Reloj `t` | `ClockPort.now()` dentro de la transacción del comando. No cuenta el cliente, el BFF ni el runner. |
| Frontera | `t < D` está a tiempo. `t = D` o después está fuera de plazo. Precisión de milisegundo. |
| Solicitud `open` | Sigue negociable mientras `t < D` y faltan consentimientos requeridos. |
| Solicitud `escalated` | La propuesta vigente venció sin el último consentimiento. Los Teams ya no negocian. |
| Hecho de vencimiento | Una sola acción de auditoría (`schedule_change_expired`, capacidad `system`) al pasar a `escalated`. |
| Estado `expired` | No se escribe. El vencimiento es el hecho. El estado de la solicitud es `escalated`. |

El kickoff actual del Encounter **no** es ancla. El inicio propuesto **no** es ancla. La creación
de la solicitud **no** es ancla si ya hubo contrapropuesta.

## Alternativas

### Duración y origen del plazo

| Aspecto | A. 12 h fijas de producto | B. Reglamento de etapa, default 12 h | C. `min(duración, kickoff actual)` |
| --- | --- | --- | --- |
| Ancla | `createdAt` de la propuesta vigente | Igual | `createdAt`, recortado por el inicio actual `K` |
| Duración | 12 h exactas | Entero `rescheduleProposalExpiryHours` (recomendado 1–72), default 12 | 12 h o las horas del reglamento, recortadas por `K` |
| Quién fija el plazo | La regla de producto | El organizador en el reglamento de etapa | La regla, limitada por el calendario |
| Campo nuevo en competitions | No | Sí. Distinto de `minimumRescheduleNoticeHours` | El de A o B, más el recorte |
| Propuesta después de `K` | Recibe su ventana completa | Recibe su ventana completa | Nace vencida |
| Cambio de reglamento | No aplica | No reescribe un `D` ya guardado | Igual que A o B para el `D` guardado |
| Coste | Un campo `D` por propuesta y un runner | Además, campo de reglas, UI y validación | El de A o B, más propuestas nacidas muertas |

C se descarta. Es el mismo error que el default viejo de DEC-021. Los capitanes piden cambio cuando
ya no pueden jugar. Eso suele ser cerca o después del horario actual. Con `K` como tope, muchas
solicitudes nacerían vencidas.

Una variante D, «hasta el inicio propuesto», recorta `D` con la fecha nueva. Evita una solicitud
abierta que ya nadie puede aceptar. También acorta el plazo cuando alguien propone dentro de pocas
horas. No se recomienda para el primer corte. Aceptar ya falla si la fecha propuesta dejó de estar
en el futuro. El runner escala al llegar `D`.

### Destino al vencer

| Aspecto | 1. `open` → `escalated` (recomendado) | 2. `open` → `expired` → `escalated` | 3. `open` → `expired` y se acaba |
| --- | --- | --- | --- |
| Encaje con DEC-033 | Directo | Hay un limbo extra | El organizador no recibe el caso |
| Solicitud activa | `escalated` sigue activa y bloquea otra incompatible | Hay que definir si `expired` bloquea | Se puede abrir otra y saltarse al organizador |
| Jobs | Uno | Dos, o un segundo comando manual | Uno, sin cierre operativo |

Se recomienda 1. El glosario lista `expired` y `escalated` por separado. Eso se lee aquí como
hecho de vencimiento más estado de la solicitud, no como dos estados terminales.

## Recomendación

**Duración:** alternativa B. Campo nuevo `rescheduleProposalExpiryHours` en las reglas de etapa.
Entero de 1 a 72. Default 12. No reutilizar `minimumRescheduleNoticeHours`.

**Por qué B.** El default escrito en DEC-032 ya contempla reglamento. Una copa de fin de semana no
tiene el mismo ritmo que una liga semanal. Una propuesta a las 22:00 con 12 h fijas vence a las
10:00. Eso puede ser lo que se busca. El reglamento deja elegir 24 h sin otra decisión de producto.
Si se prefiere cero superficie nueva en competitions, la alternativa A es el recorte válido.

**Ancla.** `createdAt` de la propuesta vigente. Cada contrapropuesta guarda un `D` propio.

**Frontera.** `t < D` a tiempo. `t ≥ D` fuera. Igual que DEC-021, otro código y otra constante.

**Al vencer.** Runner o comando de recuperación, con el mismo lock del Encounter y CAS de
`version`. Si la solicitud sigue `open` y `t ≥ D`, pasa a `escalated` una sola vez. El horario no
cambia. No se acepta por silencio. No se crea `OfficialResult`. No se consume cupo.

**Tras escalar.** Los Teams no aceptan, no rechazan y no contrapropponen. El organizador resuelve
con `encounters.reschedule.resolve`. La solicitud `escalated` sigue activa. Bloquea otra solicitud
incompatible hasta que el organizador cierre.

## Regla común

Estas reglas valen para A y para B. C no entra.

### Respuestas a tiempo y tardías

Cuentan como respuesta: aceptar, rechazar y contraproponer, de rival o de organizador requerido.

Una respuesta en `t < D` tiene el efecto actual de #121 y #122.

Una respuesta en `t ≥ D` falla con un error estable
`scheduling.schedule_change_response_window_closed`. No cambia estado. No aplica horario. No añade
decisión. La guardia rige aunque el runner aún no haya pasado la solicitud a `escalated`.

Un replay de un comando que sí quedó a tiempo devuelve su resultado histórico. No vuelve a decidir.

### Contrapropuestas

Una contrapropuesta a tiempo añade una propuesta nueva. Esa propuesta es la vigente. Los
consentimientos de la anterior ya no cuentan. El `D` anterior deja de gobernar. El nuevo `D` es
`createdAt` de la contrapropuesta más la duración vigente **en ese instante**.

Una contrapropuesta tardía falla igual que un aceptar tardío.

### Consentimiento parcial

Si hacen falta rival y organizador, y solo uno consiente antes de `D`, la solicitud sigue `open`
hasta `D` y luego escala. El consentimiento parcial queda en el historial. No aplica horario.

El reloj **no** se reinicia cuando llega el primer consentimiento.

### Cambios de reglamento

`D` se guarda al crear la propuesta. Cambiar `rescheduleProposalExpiryHours` no reescribe un `D`
ya guardado.

Una contrapropuesta posterior lee las reglas de ese momento y guarda su propio `D`.

`allowRescheduling` y el cupo se siguen releyendo al aplicar un horario, como hoy. Tras escalar,
el organizador puede cerrar el caso aunque el reglamento haya desactivado reprogramaciones nuevas.
Fijar fecha sigue bloqueado si el alcance tiene slot protegido, selección o resultado aprobado.

Un cambio de «quién debe aprobar» no reabre una solicitud `escalated` ni la acepta.

### Tratamiento legacy

Las solicitudes `open` creadas antes de esta política no tienen `D`.

Al migrar, se calcula `D = createdAt + duración` de la propuesta vigente. La duración es 12 h en A,
o el valor del reglamento (default 12) en B. Se guarda. No se concede un plazo nuevo desde la
migración.

Si ese `D` ya pasó, los Teams ya no pueden responder. El runner las pasa a `escalated` en el
primer barrido. No se aceptan por silencio. No se inventa fecha.

Las solicitudes ya `accepted`, `rejected` o `cancelled` no cambian. Reciben metadata de lectura
si hace falta. No se escalan.

### Transición a `escalated`

Condición: solicitud `open`, propuesta vigente, `t ≥ D`, y no están dados todos los
consentimientos requeridos sobre esa propuesta.

Efecto, en una transacción, bajo el lock del Encounter:

1. Estado `escalated`.
2. `version + 1`.
3. Una acción `schedule_change_expired` con `D`, `processedAt`, actor de sistema y versiones
   antes/después.
4. Horario intacto. Sin fila de aplicación. Sin cupo consumido. Sin `OfficialResult`.

Repetir el runner no añade otra acción. Una solicitud que ya no está `open` se omite.

El kickoff no dispara esta transición. Tampoco la dispara el inicio propuesto. Solo `D`.

### Aceptación concurrente con el vencimiento

Aceptar y vencer compiten por el mismo lock y la misma `version`. El resultado es uno solo.

- Si el último consentimiento requerido se evalúa con `t < D` y el `UPDATE` gana, la solicitud
  queda `accepted` y el horario se aplica. El runner posterior no escala.
- Si el runner evalúa `t ≥ D` mientras sigue `open` y el `UPDATE` gana, queda `escalated`. Un
  aceptar que llegue después falla, aunque su `commandKey` sea nuevo.
- Un aceptar evaluado con `t ≥ D` falla aunque el runner no haya corrido.

No hay un estado «aceptado y escalado». No hay un horario aplicado y luego revertido por el
runner.

### Silencio

El silencio no es consentimiento. El silencio no es rechazo. El silencio no es walkover. El
silencio no elige perdedor. Solo deja la solicitud lista para que el runner la escale.

### Separada de DEC-021

| | DEC-021 | DEC-032 / DEC-033 |
| --- | --- | --- |
| Contexto | results, selección oficial | scheduling, cambio de horario |
| Default de duración | 24 h, validado | 12 h o reglamento, **pendiente** |
| Destino | `organizer_review` | `escalated` |
| Efecto oficial al vencer | Ninguno | Ninguno |
| Job | confirmation-expiry | otro job, otro endpoint |
| Constante o campo | propios | propios |

Un reglamento que cambie esta política no cambia DEC-021. Al revés tampoco.

### Notificaciones

FTR-NTF-001 pide avisar una reprogramación. Esta propuesta no diseña plantillas. El hecho
`schedule_change_expired` y la resolución del organizador son los eventos que notifications
podrá consumir después. El vencimiento no se bloquea si el correo falla.

## Qué puede decidir el organizador

Permiso: `encounters.reschedule.resolve`. Superficie nueva, no el `accept` de negociación.
Motivo obligatorio en todos los cierres.

La solicitud debe estar `escalated`. Si sigue `open` y `t < D`, el organizador solo actúa si su
aprobación es requerida, con los comandos de hoy.

### 1. Fijar fecha

El organizador elige un inicio futuro, distinto del actual. Puede ser la fecha de la propuesta
vencida u otra.

Efecto:

- Aplica el horario con la misma regla de alcance que un aceptar que cierra (`entire_encounter`
  desplaza todos los slots el mismo delta; `official_match` mueve solo ese slot).
- Escribe la fila de aplicación y el evento `scheduling.encounter-rescheduled`.
- Recalcula candidatos por el camino ya existente (DEC-024, #112).
- Cierra la solicitud como `resolved_by_organizer` con desenlace `schedule_set`.
- No usa los consentimientos parciales viejos como base. La base es la resolución del organizador.

`resolved_by_organizer` no existe aún en el runtime. Hoy `accepted` significa «todas las
aprobaciones requeridas sobre la propuesta vigente, y el horario aplicado». Mezclar ambos
escondería la base legal. Se recomienda añadir el estado al implementar. Hasta entonces, no
está aprobado.

**Cupo (recomendación, pendiente de validar).** Consumir el cupo del Team que **abrió** la
solicitud. Ese Team pidió el cambio. El organizador solo desbloquea el calendario.

**Antelación mínima.** Fuera de esta propuesta. El otro thread es dueño. Recomendación para no
dejar casos abiertos: la fecha impuesta por el organizador no se bloquea por la antelación de
Teams. Eso lo tiene que confirmar ese thread.

Sigue bloqueado: slot protegido, selección o resultado aprobado, fecha no futura.

### 2. Conservar el horario (recomendado aunque DEC-033 no lo nombra)

Cierra la solicitud como `resolved_by_organizer` con desenlace `schedule_kept`. El horario no
cambia. No hay aplicación. No se consume cupo. Los Teams pueden abrir otra solicitud después, si
el reglamento y el cupo lo permiten.

Sin esta salida, el organizador solo podría inventar una fecha o empujar un walkover. Eso no
cierra un desacuerdo inocuo.

### 3. Walkover (intención, no resultado oficial)

DEC-033 permite walkover. Scheduling no puede oficializar un marcador.

Efecto en scheduling:

- Cierra la solicitud como `resolved_by_organizer` con desenlace `walkover_intended`.
- El horario no cambia.
- No se consume cupo.
- El organizador nombra el Team ganador (o el que se da por perdido) y el motivo.
- El silencio **no** elige al perdedor. Si el organizador no quiere señalar a nadie, usa
  conservar horario o fijar fecha.

Efecto que **no** ocurre en scheduling:

- No se crea `OfficialResult`.
- No se publica `results.official-result-approved`.
- No se tocan standings, bracket, rankings ni portal.

Un walkover que cuente de verdad necesita un contrato en results. Hoy un `OfficialResult` exige
partidos de proveedor por slot. Ese contrato no existe. Esta propuesta solo deja la solicitud
cerrada y la intención auditada. Implementar el marcador oficial es otra tarea, en results.

Alcance de la intención: el alcance de la solicitud. `entire_encounter` habla del Encounter.
`official_match` habla de ese OfficialMatch. Results tendrá que respetar esa frontera cuando
exista el comando.

### Qué no puede hacer el organizador en `escalated`

- Aceptar o rechazar con los comandos de negociación.
- Contraproponer en nombre de un Team.
- Aplicar una fecha pasada.
- Reabrir la negociación para que los Teams sigan.
- Oficializar estadísticas o tabla desde scheduling.

## Vectores de aceptación

Estos instantes son el contrato de las pruebas del desarrollo **posterior**. No se escriben
pruebas ahora. Cada fila es un escenario independiente.

Contexto común, salvo que la fila diga otra cosa:

- Kickoff actual `K = 2026-11-01T18:00:00.000Z`.
- El Team A abre la solicitud y propone `P1` en `P = 2026-11-01T08:00:00.000Z`.
- Fecha propuesta `S1 = 2026-11-02T20:00:00.000Z`.
- Hace falta la aprobación del rival. No hace falta la del organizador, salvo las filas que lo
  piden.
- El reloj es el de la API.

Deadlines:

- **A (12 h fijas):** `D = 2026-11-01T20:00:00.000Z`.
- **B-6 (reglamento 6 h):** `D = 2026-11-01T14:00:00.000Z`.
- **C (descartada, tope `K`):** `D = 2026-11-01T18:00:00.000Z`.

Salidas:

- **Aplica:** `accepted`, horario `S1` (o la fecha de esa fila), una aplicación, cupo del Team
  solicitante +1.
- **Sigue abierta:** `open`, sin aplicación.
- **Cerrada:** error `scheduling.schedule_change_response_window_closed`, sin cambio.
- **Escala:** `escalated`, una acción `schedule_change_expired`, horario intacto, cero aplicación.
- **Fecha fijada:** `resolved_by_organizer` / `schedule_set`, horario aplicado.
- **Horario conservado:** `resolved_by_organizer` / `schedule_kept`, horario intacto.
- **Walkover intended:** `resolved_by_organizer` / `walkover_intended`, horario intacto, cero
  `OfficialResult`.

### Frontera y silencio

| ID | Acción | Instante (UTC) | A (12 h) | B-6 (6 h) | C (descartada) |
| --- | --- | --- | --- | --- | --- |
| V32-01 | B acepta | `2026-11-01T13:59:59.999Z` | Aplica | Aplica | Aplica |
| V32-02 | B acepta | `2026-11-01T14:00:00.000Z` | Aplica | Cerrada | Aplica |
| V32-03 | B acepta | `2026-11-01T17:59:59.999Z` | Aplica | Cerrada | Aplica |
| V32-04 | B acepta | `2026-11-01T18:00:00.000Z` | Aplica | Cerrada | Cerrada |
| V32-05 | B acepta | `2026-11-01T19:59:59.999Z` | Aplica | Cerrada | Cerrada |
| V32-06 | B acepta | `2026-11-01T20:00:00.000Z` | Cerrada | Cerrada | Cerrada |
| V32-07 | B acepta | `2026-11-01T20:00:00.001Z` | Cerrada | Cerrada | Cerrada |
| V32-08 | B rechaza | `2026-11-01T20:00:00.000Z` | Cerrada | Cerrada | Cerrada |
| V32-09 | Silencio; runner | `2026-11-01T19:59:59.999Z` | Sigue abierta | Escala | Escala |
| V32-10 | Silencio; runner | `2026-11-01T20:00:00.000Z` | Escala | Escala | Escala |

### Contrapropuesta

B contrapropone `P2` con `S2 = 2026-11-03T21:00:00.000Z` en el instante de la fila. El reglamento
no cambia entre `P1` y `P2`.

| ID | Instante de `P2` | A: `D2` | A: efecto | B-6: `D2` | B-6: efecto |
| --- | --- | --- | --- | --- | --- |
| V32-11 | `2026-11-01T12:00:00.000Z` | `2026-11-02T00:00:00.000Z` | `open`, `P2` vigente | `2026-11-01T18:00:00.000Z` | `open`, `P2` vigente |
| V32-12 | `2026-11-01T14:00:00.000Z` | `2026-11-02T02:00:00.000Z` | `open`, `P2` vigente | — | Cerrada; `P1` sigue vigente |
| V32-13 | `2026-11-01T20:00:00.000Z` | — | Cerrada; `P1` sigue vigente | — | Cerrada; `P1` sigue vigente |

Aceptar `P1` después de un `P2` a tiempo falla por propuesta obsoleta, no por el plazo.

### Reglamento que cambia a mitad

`P1` nace con 12 h. `D1 = 2026-11-01T20:00:00.000Z` queda guardado. A las
`2026-11-01T10:00:00.000Z` el reglamento pasa a 6 h.

| ID | Acción | Instante (UTC) | Resultado |
| --- | --- | --- | --- |
| V32-14 | B acepta `P1` | `2026-11-01T16:00:00.000Z` | Aplica. El `D` guardado no se recorta. |
| V32-15 | B contrapropone `P2` | `2026-11-01T12:00:00.000Z` | `open`. `D2 = 2026-11-01T18:00:00.000Z` (6 h desde `P2`). |
| V32-16 | Runner sobre `P1` (sin contra) | `2026-11-01T20:00:00.000Z` | Escala. El reglamento nuevo no adelanta `D1`. |

En A no hay cambio de reglamento. V32-14 y V32-16 se leen igual. V32-15 usaría `D2` de 12 h.

### Aceptación concurrente con el vencimiento

| ID | Primera escritura que gana | Segunda operación | Resultado |
| --- | --- | --- | --- |
| V32-17 | B acepta en `2026-11-01T19:59:59.999Z` (último consentimiento) | Runner en `2026-11-01T20:00:00.000Z` | Aplica. El runner omite. Una sola aplicación. |
| V32-18 | B acepta en `2026-11-01T20:00:00.001Z` | Runner en `2026-11-02T03:00:00.000Z` | Cerrada; luego escala una vez. Horario intacto. |
| V32-19 | Runner en `2026-11-01T20:00:00.000Z` | B acepta en `2026-11-01T20:00:00.100Z` | Escala. El aceptar falla por solicitud cerrada o ventana cerrada. Horario intacto. |
| V32-20 | Rival consiente en `2026-11-01T19:59:59.999Z`; también hace falta el organizador | Runner en `2026-11-01T20:00:00.000Z` | Escala. Horario intacto. El consentimiento parcial no aplica. |
| V32-21 | Replay del aceptar de V32-17 | Runner | El replay devuelve `accepted` histórico. El runner omite. |

### Kickoff, fecha propuesta y legacy

| ID | Caso | A (12 h) | B-6 | C (descartada) |
| --- | --- | --- | --- | --- |
| V32-22 | `P1` se crea después de `K`, en `2026-11-01T19:00:00.000Z` | `D = 2026-11-02T07:00:00.000Z`. `K` no recorta. | `D = 2026-11-02T01:00:00.000Z`. `K` no recorta. | `D = K < P`. Nace vencida. |
| V32-23 | Default viejo `min(P + 12 h, K)` con `P` de V32-22 | Descartado: nace vencida. | Descartado. | Es C. |
| V32-24 | `S1` ya pasó y `t < D`. B acepta en `2026-11-01T19:00:00.000Z` con `S1 = 2026-11-01T12:00:00.000Z` | Falla `scheduling.invalid_schedule_change_date`. Sigue `open`. | Igual si `t < D` de B. | No se usa. |
| V32-25 | Misma `S1` pasada. Runner en `D` | Escala. Horario intacto. | Escala. | — |
| V32-26 | Legacy `open`, `createdAt = 2026-10-20T08:00:00.000Z`, migrado después de ese `D` | `D` retroactivo `2026-10-20T20:00:00.000Z`. Responder ya falla. El runner escala. Sin plazo nuevo. | Igual con `D = 2026-10-20T14:00:00.000Z` si el reglamento leído es 6 h. | Nace o queda vencida según `K`. |

### Resolución del organizador

Tras V32-10 en A. Solicitud `escalated`. Horario sigue en `K`.

| ID | Decisión | Instante (UTC) | Resultado |
| --- | --- | --- | --- |
| V32-27 | Fija `S3 = 2026-11-03T19:00:00.000Z` | `2026-11-02T09:00:00.000Z` | Fecha fijada. Horario `S3`. Cupo +1 del Team A (si se valida esa regla). |
| V32-28 | Fija `S3 = 2026-11-02T08:00:00.000Z` | `2026-11-02T09:00:00.000Z` | Falla fecha no futura. Sigue `escalated`. |
| V32-29 | Acepta `P1` con el comando de negociación | `2026-11-02T09:00:00.000Z` | Falla. La negociación está cerrada. |
| V32-30 | B contrapropone | `2026-11-02T09:00:00.000Z` | Falla. Los Teams no negocian en `escalated`. |
| V32-31 | Conserva el horario | `2026-11-02T09:00:00.000Z` | Horario conservado. `K` intacto. Cupo intacto. |
| V32-32 | Walkover. Ganador Team A. Motivo «rival no respondió» | `2026-11-02T09:00:00.000Z` | Walkover intended. `K` intacto. Cero `OfficialResult`. Cero proyección. |
| V32-33 | Walkover sin nombrar Teams | `2026-11-02T09:00:00.000Z` | Falla. El silencio no elige perdedor. |
| V32-34 | Otra solicitud incompatible del Team B, misma scope | `2026-11-02T09:00:00.000Z` | Falla. `escalated` sigue activa. |
| V32-35 | Runner otra vez | `2026-11-02T10:00:00.000Z` | Omite. Una sola acción de vencimiento. |

## Qué necesita validación

Estas preguntas las tiene que responder producto. La evidencia no las cierra.

1. **¿A o B?** 12 h fijas, o reglamento con default 12 y campo nuevo 1–72. Recomendación: B.
2. **¿12 h es el default correcto?** Una propuesta nocturna vence a la mañana siguiente.
3. **¿Se añade «conservar horario»?** DEC-033 solo nombra fecha o walkover. Recomendación: sí.
4. **¿El cupo baja al fijar fecha el organizador?** Recomendación: sí, contra el Team que abrió.
5. **¿`resolved_by_organizer` es estado nuevo o se reutiliza `accepted`?** Recomendación: estado
   nuevo.
6. **Walkover de verdad.** ¿Se espera un `OfficialResult` en el mismo corte, o basta la intención
   en scheduling y results se abre después?
7. **Antelación mínima al fijar fecha.** Lo confirma el otro thread. Recomendación de este lado:
   el organizador no queda bloqueado por la antelación de Teams.

## Fuera de alcance

- Runtime, migraciones, job, HTTP, SDK, pantallas.
- Semántica de `minimumRescheduleNoticeHours` (otro thread, otro archivo).
- DEC-034 (fecha límite de reprogramar, solo staff).
- Marcar DEC-032 o DEC-033 como validadas.
- ADR nuevo. La frontera scheduling ≠ results ya está decidida. Esta propuesta no la mueve.
- Pruebas artificiales sobre este texto. Los vectores V32-01…V32-35 son el contrato cuando se
  implemente.

## Relación con el desarrollo posterior

Cuando producto valide, el trabajo de implementación debe:

1. Guardar `D` al crear cada propuesta.
2. Rechazar respuestas con `t ≥ D` antes de cambiar estado.
3. Pasar `open` → `escalated` una vez, con lock, CAS y actor de sistema.
4. Tratar `escalated` como solicitud activa.
5. Añadir los comandos de resolución del organizador.
6. Ejercitar los vectores validados con reloj y fechas **literales**. No comparar este documento
   ni una constante suelta.

Hasta esa validación, el default de DEC-032/033 sigue siendo default, no regla.
