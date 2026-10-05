# Selección oficial: propuesta, desacuerdo y resolución

`@futrob/results` es dueño de las transiciones, las propuestas, las acciones de confirmación, las
disputas y su auditoría. La API compone la atomicidad con statistics ([ADR-0016](/docs/adr/0016-official-results-transactional-projection.md));
la autorización es contextual ([ADR-0017](/docs/adr/0017-contextual-capability-authorization.md)).
Este documento describe el corte de dominio y persistencia; HTTP, SDK, BFF y pantallas (tarea 5) no
existen todavía.

## Modelo

| Concepto                       | Qué guarda                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `OfficialMatchSelection`       | Un proceso por Encounter: estado, `version` (compare-and-swap), `round` y la propuesta vigente.                    |
| `OfficialSelectionProposal`    | Versión inmutable de una selección: Team proponente, actor, slots `1..N`, propuesta a la que responde y motivo.    |
| `ConfirmationAction`           | Auditoría append-only: acción, estados antes/después, versiones, actor, Team o capacidad administrativa, motivo.   |
| `MatchDispute`                 | Expediente único activo por selección: apertura, toma del caso y resolución con motivo.                            |
| Reserva de referencia          | Propiedad de `(providerKey, externalId)` por una selección; liberarla conserva la fila con su fecha de liberación. |
| `OfficialResult` (append-only) | Revisión aprobada. Guarda `selectionId`, `proposalId` y la base (`team_agreement` / `operator_resolution`).        |

`round` separa ciclos de negociación: avanza cuando el operador devuelve el caso a selección y cuando
se propone de nuevo sobre una selección anulada. Solo las propuestas de la ronda vigente pueden aprobarse.

## Transiciones

| Desde                                            | Comando (quién)                                        | Hacia                            | Efecto oficial                     |
| ------------------------------------------------ | ------------------------------------------------------ | -------------------------------- | ---------------------------------- |
| sin selección, `selection_in_progress`, `voided` | proponer (capitán/subcapitán de un Team del Encounter) | `awaiting_opponent_confirmation` | ninguno                            |
| `awaiting_opponent_confirmation`                 | confirmar la versión exacta (rival)                    | `confirmed` → `approved`         | un resultado; revisión N+1         |
| `awaiting_opponent_confirmation`                 | confirmar con flag de integridad bloqueante            | `confirmed` → `organizer_review` | ninguno                            |
| `awaiting_opponent_confirmation`                 | rechazar con motivo (rival)                            | `disputed`                       | ninguno                            |
| `awaiting_opponent_confirmation`                 | alternativa incompatible con motivo (rival)            | `disputed`                       | ninguno                            |
| `awaiting_opponent_confirmation`                 | alternativa equivalente (mismos pares slot→ref)        | como confirmar                   | como confirmar                     |
| `awaiting_opponent_confirmation`                 | abrir disputa con motivo (cualquiera de los Teams)     | `disputed`                       | ninguno                            |
| `disputed`                                       | tomar el caso (`encounters.results.approve`)           | `organizer_review`               | ninguno                            |
| `organizer_review`                               | resolver: aprobar una propuesta (motivo)               | `approved`                       | un resultado; revisión N+1         |
| `organizer_review`                               | resolver: devolver a selección (motivo)                | `selection_in_progress`          | ninguno; libera referencias        |
| `approved`                                       | anular (`encounters.results.approve`)                  | `voided`                         | el resultado pasa a `voided`       |
| `approved`                                       | rechazar, alternativa, disputa, confirmar              | `approved`                       | error `selection_already_approved` |

La matriz vive en `selection-transitions.ts` con un tipo mapeado: añadir un `SelectionStatus` sin decidir
sus comandos no compila. `confirmed` es transitorio dentro del comando que aprueba; la auditoría lo
distingue de la aprobación con dos entradas.

No existe un comando que edite un resultado aprobado. Un cambio posterior se hace anulando (`voided`) y
aprobando de nuevo: la revisión anterior queda intacta y la nueva es N+1.

## Autoridad

- **Acciones de Team** (proponer, confirmar, rechazar, alternativa, abrir disputa): el actor indica el
  `actingTeamId`. Se exige que el Team juegue el Encounter, que el actor sea capitán o subcapitán con
  inscripción aprobada (`TeamRepresentationPort`, resuelto con rosters y entries) y que
  `AuthorizationPort` permita `officialSelectionPropose`/`officialSelectionResolve` con el scope
  organización → competición → Team → Encounter. Personal de organización o staff no representan a un Team.
- **El proponente no confirma** ni responde a su propia propuesta: la regla es por Team, así que el
  subcapitán del mismo Team tampoco sustituye al rival.
- **Acciones administrativas** (tomar el caso, resolver, anular): `RESULT_PERMISSION.resultApprove` en el
  Encounter. Responder como rival no concede aprobar. El catálogo de capacidades no cambia.
- **Replay**: se autoriza primero y después se busca la clave. Una clave histórica no restaura un permiso
  o representación revocados.

## Integridad de las referencias (FR-12)

Una referencia `(providerKey, externalId)` pertenece a una sola selección en todo el sistema (decisión
global, no por organización). El índice único parcial de `official_selection_reference_claims`
(`WHERE released_at IS NULL`) arbitra la carrera entre dos Encounters concurrentes; el lock por
Encounter no es la protección. El error no revela de qué tenant es la referencia.

| Momento                      | Reservas de la selección                                                    |
| ---------------------------- | --------------------------------------------------------------------------- |
| Proponer / alternativa       | Se reservan las referencias de la propuesta nueva.                          |
| Rechazo, disputa, revisión   | Se conservan las de todas las propuestas vivas (la evidencia no se suelta). |
| Aprobar                      | Se conservan solo las de la propuesta aprobada.                             |
| Devolver a selección, anular | Se liberan todas; las filas permanecen con `released_at`.                   |

Un intento de reutilizar una referencia ya reservada falla con `results.reference_already_claimed` y deja
una entrada `reference_reuse_rejected` (sin clave de comando, para que no se confunda con un replay).
Además se valida la cantidad, los slots exactos `1..N`, que no se repita ninguna referencia y que cada una
sea un candidato elegible del Encounter (al proponer y otra vez al aprobar).

## Flags de integridad (DEC-022)

Bloquean la autoaprobación y envían el caso a `organizer_review`: `provider_data_incomplete` y
`provider_match_disconnected`. Elegibilidad, completitud de la selección y unicidad son invariantes: fallan
el comando y ningún permiso las omite. Un operador aprueba con flags presentes solo si los reconoce
explícitamente; el reconocimiento queda en la auditoría.

## Idempotencia y concurrencia

Cada comando lleva `commandKey` y `expectedVersion`. La misma clave con el mismo contenido devuelve el
resultado original (`replayed: true`) sin duplicar acciones, eventos ni proyección; con otro contenido falla
con `results.command_key_reused`. El repositorio hace compare-and-swap sobre la versión, y el estado, la
propuesta, la auditoría, la disputa y las reservas se escriben juntos (`commitTransition`). Con dos comandos
incompatibles sobre la misma versión gana uno y el otro recibe `results.selection_version_conflict`.

## Política de motivos sensibles

Results conserva la explicación operativa y sustituye cada correo o teléfono plausible por el
literal `[REDACTED]`. El recorte exterior sigue ocurriendo antes de validar el motivo. El resto del
texto, su puntuación y su capitalización no cambian. Por ejemplo:

| Entrada                                          | Representación auditada/servida          |
| ------------------------------------------------ | ---------------------------------------- |
| `Marcador incorrecto; llamar +1-555-0100`        | `Marcador incorrecto; llamar [REDACTED]` |
| `Avisar a arbitro@example.com sobre el marcador` | `Avisar a [REDACTED] sobre el marcador`  |
| `Se invirtieron los slots`                       | `Se invirtieron los slots`               |

La detección cubre correos con dominio punteado; teléfonos internacionales con `+` y entre
7 y 15 dígitos (admite espacios, puntos, guiones y paréntesis); teléfonos nacionales en
formatos `555 555 0100`, `555-555-0100` o `(555) 555-0100`; y números locales `555-0100`
o `555.0100`. No elimina números sin esos formatos, fechas ni marcadores. No pretende detectar
toda PII ni direcciones ofuscadas: si cambia el catálogo de datos sensibles, debe ampliarse
esta política con ejemplos de comportamiento antes de exponerlos.

El inventario y el límite de aplicación son:

| Superficie                                           | Tratamiento                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `official_selection_proposals.reason`                | Las escrituras nuevas guardan la representación redactada.                                             |
| `official_selection_actions.reason`                  | `buildAction` redacta toda acción nueva, incluidas revisión y anulación.                               |
| `match_disputes.opened_reason` / `resolution_reason` | Las aperturas y resoluciones nuevas guardan la representación redactada.                               |
| Vista autorizada y DTO de comando/replay             | Redactan de nuevo al salir para proteger filas legacy sin mutarlas.                                    |
| `request_fingerprint` nuevo/legacy                   | Todo DTO sirve `null`; replay compara el valor interno original antes de mapear la salida.             |
| Eventos y access logs actuales                       | Los eventos de selección omiten motivos y el access log solo registra método, path, status y duración. |
| Logs de transacción                                  | Commit registra evento y request ID; rollback añade el nombre del error, no el comando ni sus motivos. |

Las filas anteriores a esta política permanecen intactas. No se ejecuta `UPDATE` ni `DELETE` sobre
propuestas o acciones append-only. La redacción de lectura conserva IDs, actores, Teams, fechas,
estados, versiones, referencias y secuencia.

Esta política no redefine la identidad de replay. Dos comandos que solo difieren en el dato
redactado deben seguir siendo distintos. Por eso el fingerprint interno todavía usa el motivo
normalizado original. #128 debe reemplazar esa representación persistida por el digest opaco del
contenido canónico antes de integrar o exponer estos DTOs; #127 por sí solo se mantiene como draft.

## Composición y estadísticas

`apps/api/src/di/create-modules.ts` ejecuta cada comando dentro de `TransactionPort.runInTransaction` con el
lock del Encounter. Solo cuando el resultado trae `approvedResult` y no es un replay se proyecta statistics;
si la proyección falla se lanza el error para revertir selección, auditoría y resultado. Proponer, rechazar,
alternativa incompatible, disputa, revisión y devolución nunca llaman a la proyección. Una alternativa
equivalente confirma y puede aprobar, igual que una confirmación explícita. Confirmación, alternativa
y resolución adquieren el lock de competición antes del lock del Encounter para evitar órdenes inversos
durante la proyección del ranking.

El publisher de eventos sigue siendo `NoopEventPublisher`: los eventos `results.official-matches-selected`,
`results.official-selection-confirmed`, `results.match-dispute-opened` y `results.official-result-approved`
se publican tras el commit pero no se entregan de forma durable. No hay outbox ni notificaciones.

## Pendiente fuera de este corte

- HTTP, OpenAPI, SDK, BFF y UI del Match Center (tarea 5), y la previsualización FTR-SEL-002.
- Vencimiento de la confirmación rival (DEC-021): hoy el silencio nunca cuenta como consentimiento y no
  hay transición por plazo. Ver la sección siguiente.
- Disputa abierta por un Team sobre un resultado ya aprobado, sanciones, evidencias y notificaciones.
- Consumidor que asocie candidatos (`associate`/`recalculate`) al sincronizar o reprogramar.

## Vencimiento de la confirmación rival (DEC-021)

**Estado:** decisión validada el 2026-10-05: `D` = creación de la propuesta + 24 horas. El runtime
([#130](https://github.com/thedavos/futrob/issues/130)) todavía no existe. La comparación de alternativas y los vectores V21-01…V21-19 están en
[open-decisions §3.1](/product/open-decisions.md#31-dec-021--vencimiento-de-la-confirmación-rival).

Forma de datos que la regla exige con cualquier alternativa:

| Elemento                    | Contrato                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `OfficialSelectionProposal` | Guarda su deadline `D` como instante UTC al crearse. Cambiar la regla después no altera propuestas ya creadas.       |
| Respuesta de Team           | A tiempo si `ClockPort.now() < D`, evaluado dentro de la transacción del comando. `≥ D` falla sin efecto.            |
| Vencimiento                 | `awaiting_opponent_confirmation` → `organizer_review` con una acción `confirmation_expired` y capacidad `system`.    |
| Exclusión                   | Confirmación y vencimiento compiten bajo el mismo lock y `version`: el resultado es aprobado o vencido, nunca ambos. |
| Efecto oficial              | Ninguno al vencer: sin `OfficialResult`, sin proyección y sin evento de aprobación.                                  |

`organizer_review` ya acepta resolver sin disputa activa, igual que una confirmación con flag. Por eso la
decisión no añade un `SelectionStatus`.

El kickoff (`EncounterReader.scheduledStartAt`) solo define la ventana de candidatos (DEC-023) y no es ancla
del plazo. El TTL de reprogramación (DEC-032) pertenece a scheduling y no comparte código ni configuración.
