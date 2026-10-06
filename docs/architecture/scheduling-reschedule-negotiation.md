# Reprogramación: negociación, aprobaciones y aplicación del horario

`@futrob/scheduling` es dueño de la `ScheduleChangeRequest`, sus propuestas, sus decisiones, los
recibos de comando y la aplicación del horario aceptado. La negociación (aceptar, rechazar y
contraproponer sobre la propuesta vigente) llegó con #121. Aplicar el horario, el historial de
aplicación, el cupo consumido y el handoff de recálculo llegaron con #122; su consumo, con #112.
HTTP, SDK, BFF y pantallas (#123/#124) no existen todavía.

## Modelo

| Concepto                       | Qué guarda                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `ScheduleChangeRequest`        | Estado, alcance (`entire_encounter` u `official_match`), `version` para compare-and-set.                       |
| `ScheduleChangeProposal`       | Fecha, motivo, Team y actor proponentes. Inmutable; la última por `proposal_order` es la vigente.              |
| `ScheduleChangeDecision`       | Consentimiento o rechazo de una propuesta concreta, con la versión de la solicitud que el actor respondió.     |
| `ScheduleChangeCommandReceipt` | Resultado de un comando por `(organización, actor, commandKey)` con huella del input, para replay idempotente. |

Propuestas, decisiones y recibos son append-only en Postgres (trigger
`schedule_change_append_only`, migración `0048`). `save` solo crea la solicitud; ya no borra ni
reinserta propuestas. Las transiciones se escriben con `commit(transition, receipt)`: un `UPDATE`
condicionado por `version` y, en la misma transacción, la propuesta o decisión añadida y el recibo.

## Autoridades y matriz de aprobación

Las aprobaciones vienen del contrato propietario: `CompetitionRescheduleRulesPort.getRules` expone
`requiresOpponentApproval`, `requiresOrganizerApproval` y `minimumNoticeHours` de la etapa del
Encounter (`rescheduleRequires*`, `minimumRescheduleNoticeHours` en Competitions). Sin reglas de
etapa, el adapter cierra todo (`allowRescheduling: false`, ambas aprobaciones requeridas).

| Capacidad    | Permiso                                            | Puede                             |
| ------------ | -------------------------------------------------- | --------------------------------- |
| `rival_team` | `encounters.reschedule.request` con `teamId` rival | aceptar, rechazar, contraproponer |
| `organizer`  | `encounters.reschedule.resolve` en el Encounter    | aceptar, rechazar                 |

"Rival" es el Team que no hizo la propuesta vigente: tras una contrapropuesta de B, el rival pasa a
ser A. El Team proponente consiente al proponer.

| Oponente | Organizador | Consentimientos para `accepted` sobre la propuesta vigente        |
| -------- | ----------- | ----------------------------------------------------------------- |
| sí       | no          | rival                                                             |
| no       | sí          | organizador                                                       |
| sí       | sí          | rival y organizador, en cualquier orden                           |
| no       | no          | sin definir: `scheduling.schedule_change_approval_not_configured` |

Un actor aporta como máximo un consentimiento por propuesta, aunque tenga ambas capacidades. Una
autoridad no requerida no puede aceptar ni rechazar (`schedule_change_authority_not_required`). El
rival puede contraproponer aunque su aprobación no sea requerida.

## Comandos

Los tres reciben `requestId`, `proposalId`, `expectedVersion` y `commandKey`, y corren bajo
`TransactionPort` y el lock de mutación del Encounter. El orden es:

1. Encounter del tenant y permiso de lectura; si no, `schedule_change_encounter_not_found`.
2. Solicitud del mismo tenant y Encounter; si no, `schedule_change_request_not_found`.
3. Autorización de la capacidad. Se repite en cada replay, así que revocar el permiso lo bloquea.
4. Recibo por `(organización, actor, commandKey)`: misma huella devuelve, con `replayed: true` y sin
   escribir, la solicitud tal como la dejó ese comando (`resultingVersion`/`resultingStatus`, propuestas
   hasta la vigente y decisiones anteriores a esa versión), no el estado posterior; otra huella da
   `schedule_change_idempotency_conflict`.
5. Objetivo: solicitud `open` (`schedule_change_request_closed`), `version` igual
   (`schedule_change_version_conflict`) y propuesta vigente (`schedule_change_proposal_stale`).
6. Aceptar y contraproponer exigen `allowRescheduling` y el guard de slots protegidos.
7. Transición y `commit`; si el `UPDATE` no encuentra la versión esperada, conflicto de versión.

| Comando        | Efecto                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------- |
| aceptar        | Añade consentimiento; con el último requerido, `accepted` y aplica el horario.            |
| rechazar       | Añade rechazo (motivo opcional); `rejected`. El horario no cambia.                        |
| contraproponer | Añade propuesta del rival, que pasa a ser vigente. Consentimientos previos ya no cuentan. |

Todas incrementan `version`. Los consentimientos de propuestas anteriores siguen en el historial.

## Aplicar el horario (#122)

`accepted` significa "todas las aprobaciones requeridas sobre la propuesta vigente, y el horario
aplicado". El consentimiento que completa las aprobaciones aplica el horario dentro de la misma
transacción y bajo el mismo lock del Encounter (`AcceptScheduleChangeProposalUseCase`). No existe un
estado intermedio aprobado-sin-aplicar: aceptación y aplicación no divergen.

Antes de la primera escritura, el aceptar que completa las aprobaciones comprueba:

- Cupo: `maxReschedulesPerTeam` contra las aplicaciones del Team solicitante en ese Encounter
  (`countAppliedReschedules`, que cuenta filas de `schedule_change_applications`). Si el cupo se
  agotó, falla con `scheduling.reschedule_limit_reached` y la solicitud sigue `open`. Así, dos
  solicitudes abiertas a la vez (slot 1 y slot 2) no superan el cupo.
- La fecha aceptada sigue en el futuro; si no, `scheduling.invalid_schedule_change_date`.
- `allowRescheduling` y el guard de slots protegidos o resultado aprobado, como en #121.

Después del `commit` de la transición escribe, en este orden y en la misma transacción:

1. `official_matches.scheduled_start_at` de cada slot del Encounter (crea el slot si no existía).
2. `encounter_schedule_snapshots.scheduled_start_at`, si cambia el inicio del Encounter.
3. El `scheduled_start_at` del Encounter en el fixture activo, con compare-and-set de `revision`.
4. Evento `scheduling.encounter-rescheduled` (notificación; no es la entrega durable).

La transición de la solicitud, el recibo y la fila de aplicación se escriben en el `commit`.

### Rollback explícito

`PostgresTransactionPort` confirma lo que devuelve el callback, incluido `Result.err`. Por eso
`runScheduleChangeCommand` convierte un error posterior a la primera escritura en una excepción
interna (`ScheduleChangeRollback`) que revierte la transacción y vuelve a ser `Result.err` fuera de
ella. La prueba de Postgres provoca un conflicto real de revisión del fixture tras escribir slots,
inicio, solicitud y aplicación; todas las tablas quedan como antes y el reintento aplica una vez.
Una excepción (p. ej. del publicador de eventos) revierte igual.

### Horario por slot

- Representación: `official_matches.scheduled_start_at TIMESTAMPTZ NOT NULL` (migración `0052`);
  `OfficialMatch.scheduledStartAt` en el dominio. `officialMatchSchedules(encounter, matches)` da el
  inicio de cada slot que juega el Encounter; un slot sin fila empieza con el Encounter.
- Backfill: cada slot existente recibe el `scheduled_start_at` de su Encounter. No se inventa un
  desfase entre slot 1 y slot 2. Desde entonces el inicio del Encounter es el slot más temprano.
- `official_match` slot N: solo cambia el slot N. El otro slot conserva fecha y estado. "Distinta de
  la actual" al proponer o contraproponer se compara con la fecha del slot N.
- `entire_encounter` (decisión de producto del 2026-10-05): la fecha propuesta es el nuevo inicio del
  Encounter; todos los slots se desplazan el mismo delta (`propuesta - inicio actual`) y conservan
  su separación. Requiere que ningún slot esté protegido (guard existente).
- Los escritores directos del inicio del Encounter (edición auditada del fixture y upsert manual del
  snapshot) desplazan los slots guardados con la misma regla.

### Historial y handoff de recálculo

`schedule_change_applications` (una fila por solicitud, `UNIQUE (request_id)`) y
`schedule_change_application_slots` (antes/después de cada slot movido) son append-only con el
trigger `schedule_change_append_only`. La solicitud rehidratada expone `application`; el replay de
un comando devuelve la aplicación solo si ese comando la produjo o ya existía.

La fila de aplicación es el handoff durable para #112: se confirma con el horario y nunca se
actualiza. Scheduling la expone con el puerto público `ScheduleChangeApplicationFeedPort`:
`listUnacknowledged` devuelve, por consumidor, las aplicaciones sin confirmar (orden
`(applied_at, id)`, todas las organizaciones) y `acknowledge` registra la confirmación en
`schedule_change_application_acknowledgements` (migración `0053`, `(consumer, application_id)`).
No hay cursor ni ventana temporal: `applied_at` se lee antes del commit, así que una aplicación
puede hacerse visible después de otra posterior; mientras no tenga confirmación sigue pendiente.
Nadie se suscribe al `NoopEventPublisher`.

`RecalculateRescheduledCandidates` (`apps/api/src/application/results/`) es el consumidor
`results.candidate-recalculation`. Llama a `recalculateEncounterCandidates` con la organización y
el Encounter de cada aplicación y confirma solo después de que converja o si el Encounter ya no
existe. Un fallo transitorio o una caída dejan la aplicación pendiente para la siguiente ejecución;
repetir el recálculo converge a las mismas asociaciones. El Cron de web despierta
`POST /api/v1/internal/results/candidate-recalculation/run` cada minuto con `INTERNAL_JOB_SECRET`.
El recálculo no aplica horarios, no selecciona ni oficializa.

### Lectores

Dentro de la API, los horarios por slot se leen con `OfficialMatchRepository.listByEncounter` y
`officialMatchSchedules`. `EncounterScheduleSnapshot.scheduledStartAt` sigue siendo el inicio del
Encounter. El puente `SchedulingEncounterReader` llena `officialMatchStarts` del
`EncounterReaderPort` de Results, y `candidateWindowsFor` busca candidatos alrededor de cada slot.
El campo es opcional: si falta, todos los slots empiezan con el Encounter. La web implementa ese
puerto sobre HTTP sin slots hasta que #123 los añada al DTO del snapshot.

`ListEncounterCandidatesUseCase` y su respuesta HTTP siguen usando una sola ventana alrededor del
inicio del Encounter. El `EncounterWindowReaderPort` del sync de proveedor también filtra por ese
inicio, así que un partido jugado cerca de un slot 2 movido aparte no se asocia al sincronizar.

### Migración `0052`

`0052_schedule_change_application.sql` hace el backfill y crea las tablas de aplicación. Se niega a
correr (y no se registra en `schema_migrations`) si existe alguna solicitud `accepted`: antes de
`0052` nada aplicaba la fecha, así que una solicitud así no tiene horario que registrar. Ningún
camino de producción podía aceptar antes de #122 (no hay ruta HTTP), así que solo afecta a datos
manuales.

## Decisiones de producto

Validadas el 2026-10-05:

1. `entire_encounter` desplaza todos los slots el mismo delta (arriba).
2. Etapa sin aprobación de oponente ni de organizador: falla cerrado con
   `scheduling.schedule_change_approval_not_configured`; no hay autoservicio.
3. Las reglas se leen al ejecutar cada comando. Al aplicar se revalidan `allowRescheduling` y el
   cupo con las reglas vigentes; no se congela la versión de reglas en la solicitud.

Pendiente:

- Semántica de `minimumRescheduleNoticeHours`: ¿antelación respecto del horario actual, del
  propuesto o de ambos? Se expone en el puerto y no se aplica.

TTL, expiración y escalado (DEC-032/033) quedan fuera de este corte.
