# Selección oficial: propuesta, desacuerdo y resolución

`@futrob/results` es dueño de las transiciones, las propuestas, las acciones de confirmación, las
disputas y su auditoría. La API compone la atomicidad con statistics ([ADR-0016](/docs/adr/0016-official-results-transactional-projection.md));
la autorización es contextual ([ADR-0017](/docs/adr/0017-contextual-capability-authorization.md)).
El contrato HTTP publica las operaciones Team y la lectura/toma/resolución del operador.
`@futrob/sdk` y el BFF autenticado consumen ambas superficies mediante
[#115](https://github.com/thedavos/futrob/issues/115), implementado en este checkout sin despliegue.
Las pantallas de este flujo permanecen fuera de este corte.

## HTTP del operador

Base `/api/v1/organizations/:organizationId/encounters/:encounterId/official-selection`:

| Método y ruta            | Contrato                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /disputes`          | `OfficialSelectionView`, sin `actingTeamId`; incluye historial sanitizado, deadlines y acciones permitidas.                                                                    |
| `POST /disputes/review`  | `ReviewMatchDisputeRequest`: `commandKey`, `expectedVersion` y motivo no vacío.                                                                                                |
| `POST /disputes/resolve` | `ResolveMatchDisputeRequest`: misma base y `decision` discriminada entre `approve_proposal` (con `proposalId` y `acknowledgeIntegrityFlags` opcional) y `return_to_selection`. |

Los comandos devuelven `OfficialSelectionCommandResponse`. Las tres operaciones exigen
`encounters.results.approve` contextual y actor de service auth; body/query no concede autoridad.
La aprobación elige una propuesta de la ronda vigente en la versión exacta de selección y exige
`acknowledgeIntegrityFlags: true` si hay flags bloqueantes. No permite aprobar sin pasar por revisión.
La resolución también sirve a los casos ya enviados a revisión por integridad o vencimiento, sin
inventar una disputa. Leer no procesa vencimientos.

Los fallos usan códigos estables y detalles seguros: 400 validación, 401 autenticación, 403 permiso,
404 Encounter/selección/propuesta ausente, 409 versión/estado/clave/flags/eligibilidad/referencia.
Un replay conserva IDs y no duplica proyecciones. Devolver libera referencias sin resultado,
incrementa la ronda y exige propuesta y consentimiento nuevos.

## SDK y BFF autenticado

El recurso `results` de `@futrob/sdk` ofrece lectura Team, propuesta, confirmación, rechazo,
contrapropuesta y apertura de disputa. Para el operador ofrece lectura, toma y resolución del caso.
Los métodos y ejemplos están en [el README del SDK](/packages/sdk/README.md).

El BFF de `apps/web` publica esas mismas rutas bajo la base anterior. Obtiene el actor de la sesión
y delega a la API la autorización contextual; body/query no conceden autoridad. SDK y BFF validan
entradas y respuestas con los contratos públicos. Conservan `commandKey`, `expectedVersion`,
propuesta exacta, decisiones, deadlines y códigos seguros, sin generar otra clave ni duplicar un
comando al recibir un conflicto. Solo devuelven el DTO público con historial sanitizado por Results/API,
sin payload EA crudo ni recibos internos.

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
| `Call 555-555-0100x123`                          | `Call [REDACTED]`                        |
| `x555-555-0100`                                  | `x[REDACTED]`                            |
| `Call +1-555-0100. 2026 is relevant`             | `Call [REDACTED]. 2026 is relevant`      |

La detección cubre correos con dominio punteado; teléfonos internacionales con `+` y entre
7 y 15 dígitos (admite espacios, puntos, guiones y paréntesis); teléfonos nacionales en
formatos `555 555 0100`, `555-555-0100` o `(555) 555-0100`; y números locales `555-0100`
o `555.0100`. No elimina números sin esos formatos, fechas ni marcadores. No pretende detectar
toda PII ni direcciones ofuscadas: si cambia el catálogo de datos sensibles, debe ampliarse
esta política con ejemplos de comportamiento antes de exponerlos.

Los límites del teléfono son numéricos: una letra adyacente no impide redactarlo ni deja
dígitos de su prefijo visibles. Una extensión marcada por `x`, `ext` o `ext.` (sin distinguir
mayúsculas) se redacta junto con el número. Dentro del teléfono internacional un punto solo
une dígitos adyacentes; punto seguido de espacio y los saltos de línea terminan el teléfono,
conservando la puntuación y las cifras de la oración siguiente.

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
redactado siguen siendo distintos: #128 deriva el fingerprint del motivo normalizado original,
no del motivo redactado. #127 por sí solo no es integrable; la exposición de auditoría requiere
integrar ambos cambios. El stack no añade rutas, DTOs wire ni pantallas de auditoría.

## Recibos opacos y compatibilidad de replay (#128)

Results define `SelectionCommandDigestPort`; la API compone su implementación de SHA-256 con
`node:crypto`. No se encontró un contrato equivalente en Results ni shared-kernel: los hashes
de tokens de Organizations/Teams tienen otra semántica. La CLI offline usa un fake estable y no
constituye prueba de criptografía ni de persistencia.

Cada recibo nuevo guarda `sha256:<64 dígitos hexadecimales minúsculos>` en la columna existente
`request_fingerprint`. El prefijo es el único discriminante: los recibos históricos empiezan
por el nombre del comando seguido de `|`. La codificación siguiente queda congelada para este
formato. Un cambio futuro de algoritmo o codificación necesita un discriminante nuevo y
verificación de los formatos anteriores, nunca reinterpretación de un recibo.

La entrada del digest son los bytes UTF-8 de `JSON.stringify` de esta tupla, sin whitespace extra:

```text
["results.selection-command", organizationId, encounterId, actorId, commandType, expectedVersion, ...payload]
```

| commandType     | payload (elementos consecutivos de la tupla) |
| --------------- | -------------------------------------------- |
| propose         | actingTeamId, slots                          |
| confirm         | actingTeamId, proposalId                     |
| reject          | actingTeamId, proposalId, reason             |
| alternative     | actingTeamId, proposalId, slots, reason      |
| open_dispute    | actingTeamId, reason                         |
| review_dispute  | reason                                       |
| resolve_dispute | decision, reason                             |

`slots` es una matriz de `[officialSlot, providerKey, externalId]` ordenada por slot numérico.
`decision` es `["return_to_selection"]` o
`["approve_proposal", proposalId, acknowledgeIntegrityFlags === true]`.
Los números, booleanos, strings y null conservan su tipo; ni `|`, `:`, `=`, comillas ni
saltos de línea de un campo alteran su estructura. El motivo se recorta con `trim()`; vacío,
omitido o solo espacios se normalizan a null. No se normaliza Unicode ni se redacta antes del
digest. Omitir el reconocimiento de flags y enviar false son equivalentes; true es diferente.
El commandKey es la clave de búsqueda, no contenido semántico. Identidades de ámbito/actor,
tipo, versión y todos los campos del comando sí participan; fechas/IDs generados, estado actual
y snapshots del proveedor no participan, porque cambian después de ejecutar el comando.

No hay clave secreta, provisión, key ID ni rotación: SHA-256 es determinista entre procesos.
Esto elimina texto claro del recibo, pero no es cifrado ni evita adivinar un motivo de baja
entropía si se obtiene acceso a la base. Los DTOs nunca exponen el recibo, ni nuevo ni legacy.

Vector independiente (OpenSSL SHA-256, sin newline final):

```text
["results.selection-command","org-selection","enc-selection","actor-away-captain","open_dispute",1,"team-away","Marcador incorrecto; llamar +1-555-0100"]
sha256:e63aacf128f3c156fc8351a4c4fad3c9973fc784f39d68895c7bde5319406c06
```

El lookup sigue a la autorización actual, incluidas representación del Team y capacidades.
Si encuentra recibos `sha256:`, exige formato válido e igualdad del digest en todas las acciones
de la clave; un digest diferente, malformado o desconocido da `results.command_key_reused`.
No intenta entonces el formato legacy ni ejecuta una transición nueva.

Para un recibo textual histórico se calcula únicamente en memoria la proyección textual antigua
con el motivo original y se exige igualdad exacta. Como los delimitadores antiguos no conservaban
tipos, también se contrastan los hechos append-only: tipo de acción, actor/ámbito, Team, versión,
propuesta objetivo, propuesta sustituida y slots estructurados. El motivo de la acción se compara
con la representación redactada del motivo solicitado, distinguiendo null del literal `"-"`.
Una alternativa equivalente se contrasta con la propuesta confirmada. Esto protege colisiones
de delimitadores sin cambiar ni borrar una fila. Un recibo sin los hechos necesarios falla cerrado.
No hay fallback entre formatos; las acciones mezcladas o nulas tampoco autorizan replay.

Excepción histórica irreparable sin evidencia externa: una alternativa equivalente con motivo
vacío (null) y otra con motivo literal `"-"` tenían el mismo recibo textual, mientras sus acciones
`confirmed`/`approved` omitían el motivo. Ambas solicitudes devuelven ahora
`results.command_key_reused` para ese recibo ambiguo: no se inventa la identidad original,
no se duplica ningún efecto y no se toca el historial. Los recibos opacos nuevos distinguen
estos casos y replayan normalmente. Esta excepción explícita de compatibilidad requiere aceptación
del responsable antes de integrar el stack; no habilita exposición de motivos.

El replay reconstruye el resultado histórico y luego aplica la política de salida de #127.
Mantiene IDs, actores, fechas, versiones y conteos; no actualiza el recibo ni duplica selección,
disputa, resultado o proyección. Los tests de composición llaman la entrada del consumidor sobre
Postgres aislado, contrastan los vectores literales y leen las filas originales tras replay/conflicto.

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

- UI del Match Center y la previsualización FTR-SEL-002. HTTP y OpenAPI Team están integrados
  mediante #113; #130 añade deadline y auditoría de vencimiento al contrato. SDK y BFF Team y
  operador están implementados mediante #115.
- Disputa abierta por un Team sobre un resultado ya aprobado, sanciones, evidencias y notificaciones.

## Vencimiento de la confirmación rival (DEC-021)

**Estado:** decisión validada el 2026-10-05: `D` = creación de la propuesta + 24 horas. El runtime
([#130](https://github.com/thedavos/futrob/issues/130)) está implementado en el checkout, sin despliegue. La comparación de alternativas y los vectores V21-01…V21-19 están en
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

### Persistencia, legacy y recuperación (#130)

`OfficialSelectionProposal.confirmationDeadline` se guarda en
`official_selection_confirmation_windows`, vinculada por FK a la propuesta. Propuesta y ventana se
insertan dentro de la misma transición atómica. Ambas son append-only. Se usa `addDays(createdAt, 1)`
(24 horas exactas), independiente del kickoff y de la zona horaria.

El tratamiento legacy fue **validado explícitamente el 2026-10-05 durante #130**:
«Validar createdAt + 24 h también para legacy». La migración `0051` añade esas ventanas sin actualizar
ni borrar propuestas, acciones o reservas previas. No concede 24 horas desde la migración. Una
propuesta pendiente cuyo plazo ya pasó queda sin respuesta válida hasta que el runner la envíe a
revisión. Las propuestas históricas reciben metadata temporal para la lectura, pero sus estados y
consentimientos no cambian; solo vence la propuesta vigente en `awaiting_opponent_confirmation`.

Confirmación, alternativa equivalente, rechazo, alternativa incompatible y apertura de disputa
leen el reloj dentro de la transacción y exclusión por Encounter de `officialSelection`. La respuesta
`t ≥ D` devuelve `results.confirmation_window_closed` (409), incluso si el runner no corrió o ya
registró el vencimiento. Un replay de un comando aceptado a tiempo conserva su resultado histórico
sin ejecutar otra respuesta ni proyección. La vista autorizada oculta acciones Team fuera de plazo.

El runner consulta hasta 50 pendientes vencidas por invocación, en orden de deadline y Encounter.
Reevalúa cada propuesta después de adquirir el mismo lock y hace CAS del estado y la auditoría juntos.
Una acción `confirmation_expired` conserva `confirmationDeadline` y `processedAt` en UTC, el actor,
`capacity=system` y las versiones antes/después. El índice único por propuesta impide duplicar el hecho.
No libera reservas, crea disputa ni publica un evento de aprobación.

El Cron existente de web despierta `POST /api/v1/internal/results/confirmation-expiry/run` cada minuto
con `INTERNAL_JOB_SECRET`. El endpoint no usa ActorId ni tiempo del caller. Cada vencimiento tiene su
propia transacción: tras una caída se descubren los pendientes no confirmados, sin cola ni lease nuevos.
Una caída posterior al commit converge a `expired: 0` en el siguiente replay. Un error de escritura
revierte estado y auditoría; no basta devolver `Result.err` después de escribir.

`RESULTS_SYSTEM_ACTOR_ID` debe identificar un actor **ya provisionado por identity mediante apps/auth**.
Puede ser una cuenta dedicada sin grants de Team/operador. El runner comprueba su existencia en `actors`;
no genera IDs ni inserta identidad desde Results. Ausencia o falta de configuración devuelve 503 con
`results.confirmation_expiry_actor_unavailable`, sin transición parcial. Después de provisionar/configurar
la identidad, se reintenta sobre las mismas ventanas durables. `actor_id` sigue NOT NULL y FK.

Para aplicar este corte, detener los escritores API anteriores, aplicar la migración y arrancar la
versión nueva con el actor configurado. El backfill incluye el historial existente al aplicar `0051`;
no depende de lectores que inventen deadlines para filas escritas por una versión vieja después.
No se ha desplegado ni probado un Worker remoto o egress EA como parte de #130.
