# Reprogramación: negociación, aprobaciones y contrato para aplicar el horario

`@futrob/scheduling` es dueño de la `ScheduleChangeRequest`, sus propuestas, sus decisiones y los
recibos de comando. Este documento cubre el corte de negociación (#121): aceptar, rechazar y
contraproponer sobre la propuesta vigente. Aplicar el horario aprobado, el historial de aplicación,
el cupo consumido y el handoff de recálculo pertenecen a #122. HTTP, SDK, BFF y pantallas no existen
todavía.

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
4. Recibo por `(organización, actor, commandKey)`: misma huella devuelve el estado actual con
   `replayed: true` sin escribir; otra huella da `schedule_change_idempotency_conflict`.
5. Objetivo: solicitud `open` (`schedule_change_request_closed`), `version` igual
   (`schedule_change_version_conflict`) y propuesta vigente (`schedule_change_proposal_stale`).
6. Aceptar y contraproponer exigen `allowRescheduling` y el guard de slots protegidos.
7. Transición y `commit`; si el `UPDATE` no encuentra la versión esperada, conflicto de versión.

| Comando        | Efecto                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------- |
| aceptar        | Añade consentimiento; `accepted` cuando todas las autoridades requeridas consintieron.    |
| rechazar       | Añade rechazo (motivo opcional); `rejected`. El horario no cambia.                        |
| contraproponer | Añade propuesta del rival, que pasa a ser vigente. Consentimientos previos ya no cuentan. |

Todas incrementan `version`. Los consentimientos de propuestas anteriores siguen en el historial.

## Contrato que consume #122

- `accepted` significa "todas las aprobaciones requeridas sobre la propuesta vigente". Hoy nada aplica
  la fecha. #122 debe aplicar dentro de la misma transacción del comando que produce `accepted`
  (`AcceptScheduleChangeProposalUseCase`). Así, `accepted` y la fecha aplicada nunca divergen. Si
  prefiere un estado intermedio, debe introducirlo antes de exponer la API.
- Fecha aprobada: `currentScheduleChangeProposal(request).proposedStartAt`. Alcance: `request.scope`.
- El cupo `maxReschedulesPerTeam` cuenta solicitudes `accepted` del Team solicitante
  (`countAcceptedByTeam`). Si #122 separa aprobado de aplicado, debe cambiar ese conteo.
- `PostgresTransactionPort` confirma cuando el callback devuelve `Result.err`. En este corte ningún
  camino escribe antes de un `err`: el CAS se evalúa antes de cualquier `INSERT`. #122 escribe más
  (fecha, historial, cupo, handoff) y necesita un rollback explícito tras una escritura fallida.

### Horario por slot (propuesta para #122 y #112)

Hoy `EncounterScheduleSnapshot` tiene una sola fecha y `official_matches` no tiene horario.

- Representación: `official_matches.scheduled_start_at TIMESTAMPTZ NOT NULL` por slot. El tipo
  `OfficialMatchSlot { slotNumber, scheduledStartAt, status }` de `domain/entities/encounter.ts` ya
  describe esa forma. Los lectores públicos (snapshot/reader de Results) exponen
  `slots: { slot: 1 | 2; scheduledStartAt }[]`.
- Backfill: cada slot existente recibe el `scheduled_start_at` de su Encounter. No se inventa un
  desfase entre slot 1 y slot 2. Desde entonces, `EncounterScheduleSnapshot.scheduledStartAt` es el
  mínimo de los slots no anulados.
- `official_match` slot N: solo cambia `scheduled_start_at` del slot N. El otro slot conserva fecha y
  estado. La validación "distinta de la actual" de la propuesta debe usar la fecha del slot N, no la
  del Encounter (hoy usa la del Encounter).
- `entire_encounter`: la fecha propuesta es el nuevo inicio del Encounter. Todos los slots se
  desplazan el mismo delta (`propuesta - inicio actual`) para conservar su separación. Requiere que
  ningún slot esté protegido (lo garantiza el guard actual). Esta regla debe validarla producto.
- Pruebas futuras (#122, no ejecutables hoy): slot 1 a 2026-10-10T20:00Z y slot 2 a
  2026-10-10T21:00Z; aplicar slot 2 a 2026-10-11T21:00Z deja slot 1 exactamente en
  2026-10-10T20:00Z. Su vecino `entire_encounter` a 2026-10-11T20:00Z deja slot 2 en
  2026-10-11T21:00Z. Además, el upgrade/backfill de `official_matches` y el replay de la aplicación
  sin duplicar historial ni cupo.

## Decisiones pendientes de producto

1. Etapa sin aprobación de oponente ni de organizador: ¿la solicitud se acepta al crearse
   (autoservicio) o la configuración es inválida? Hoy falla cerrado con
   `schedule_change_approval_not_configured`.
2. Semántica de `minimumRescheduleNoticeHours`: ¿antelación respecto del horario actual, del
   propuesto o de ambos? Se expone en el puerto, pero no se aplica.
3. Las reglas se leen al ejecutar cada comando, no al crear la solicitud. Un cambio de reglas
   afecta a las solicitudes abiertas. Si el reglamento versionado debe congelarlas, hay que guardar
   la versión de reglas en la solicitud.

TTL, expiración y escalado (DEC-032/033) quedan fuera de este corte.
