# ADR-0028: Sanciones de competición

- Estado: Aceptada
- Fecha: 2026-11-10
- Relacionado: [ADR-0016](/docs/adr/0016-official-results-transactional-projection.md) · [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md) · [ADR-0008](/docs/adr/0008-notifications-web-and-email.md) · [ADR-0027](/docs/adr/0027-swiss-format-rounds-paired-by-reconciliation.md)
- Tarea: [SANC-01] Sanciones (FR-15, FTR-NTF-001, NFR-05)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

FR-15 pide sanciones y NFR-05 exige que las acciones sensibles queden auditadas con actor,
motivo, correlación y tiempo. No había nada: ni tabla, ni dominio, ni pantalla. DEC-014 ya
menciona «menos sanciones» como desempate, pero ese orden no está implementado.

Hay que decidir qué se sanciona, qué tipos existen, qué contexto es dueño y cómo afecta una
sanción a la tabla sin romper la regla de que las estadísticas oficiales solo salen de
resultados aprobados (ADR-0016).

## Decisión

**Agregado `CompetitionSanction` en `@futrob/competitions`.** Una sanción es una decisión
disciplinaria del organizador dentro de una competición. La competición ya es dueña de las
reglas, de las inscripciones (`CompetitionEntry`) y de los permisos del staff, así que no se
crea un bounded context nuevo. `competitions` sigue siendo una hoja del grafo: lo que necesita
de `teams` y `scheduling` llega por el port `SanctionTargetReaderPort`, que implementa
`apps/api`.

**Destinatario.** Un `Team` con inscripción aprobada en la competición, o un jugador
(`playerProfileId`) con plantilla en un `Team` de esa competición. La sanción a un jugador
guarda también su `teamId`, resuelto al imponerla. Así el equipo afectado la ve sin otra
consulta.

**Tipos.**

| Tipo                    | Destinatario    | Dato obligatorio                     | Efecto automático                  |
| ----------------------- | --------------- | ------------------------------------ | ---------------------------------- |
| `warning`               | equipo, jugador | —                                    | Ninguno                            |
| `points_deduction`      | equipo          | `pointsDeducted` (1–100)             | Resta puntos en la tabla           |
| `match_suspension`      | equipo, jugador | `suspensionMatches` (1–20)           | Ninguno: registro para el staff    |
| `administrative_defeat` | equipo          | `encounterId` (encuentro del equipo) | Ninguno: no crea resultado oficial |

Todas exigen un motivo de 3 a 500 caracteres. Los datos de otro tipo se rechazan.

**Auditoría append-only.** Cada sanción guarda quién la impuso, el motivo, cuándo y el
`requestId` de la petición (correlación). Nunca se borra: revocarla escribe actor, motivo,
fecha y `requestId` de la revocación sobre la misma fila, una sola vez (compare-and-set sobre
`revoked_at IS NULL`). La API no expone borrado ni edición.

**Permisos (`EffectiveAccess`).**

- `competitions.sanctions.read`: listar todas las sanciones de la competición.
- `competitions.sanctions.manage`: imponer y revocar.

Ambos entran en el catálogo de `competitions`, así que los heredan el organizador y el staff
de organización o de competición, como el resto del catálogo. Capitán y jugador no los
tienen. El equipo afectado lee las suyas con `teams.read` en el scope
organización → competición → Team: lo tiene quien está en la plantilla de ese Team en esa
competición, no el capitán de otro equipo. `competitions` no puede importar `@futrob/teams`;
`apps/api` inyecta ese permiso en `ListTeamSanctionsUseCase`. Sin permiso, la API responde 403.

**Estados de la competición.** Se puede imponer y revocar en `registration`, `published`,
`paused` y `finished`. En `draft` todavía no hay competición en juego y `archived` es de solo
lectura.

**Deducción de puntos y tabla.** `statistics` sigue siendo dueño de la tabla. Declara
`CompetitionPointDeductionReaderPort` y `apps/api` lo conecta con las sanciones activas. La
tabla se calcula siempre como _partidos oficiales aprobados + deducciones activas_:

- `buildCompetitionStandings` resta la suma de deducciones activas a los puntos del equipo y
  la guarda en la fila (`pointsDeducted`). Un equipo sancionado sin partidos aparece con
  0 jugados y puntos negativos.
- La proyección de un resultado aprobado y la reconstrucción completa leen las mismas
  deducciones, así que recalcular da la misma tabla.
- Imponer o revocar una deducción reconstruye las estadísticas de la competición en la misma
  transacción que el comando. Si falla la reconstrucción, la sanción no se guarda.
- En suizo, los puntos oficiales ya incluyen la deducción; Buchholz los usa tal cual.
- El bridge `CompetitionFixtureSourceAdapter` entrega las deducciones activas al emparejar
  rondas suizas futuras. Revocarlas actualiza el siguiente emparejamiento sin modificar rondas
  ya emparejadas ni los marcadores oficiales.

**Suspensiones y derrota administrativa.** No cambian resultados ya oficializados ni crean
resultados nuevos. Una suspensión es un registro visible para el staff y el equipo. Aplicar
una derrota administrativa a la tabla exige un resultado oficial por el camino de `results`
(walkover/forfeit), que todavía no existe; hasta entonces la sanción documenta la decisión.

**Actividad y correo.** Imponer y revocar escriben una fila `organizer_decision` con los
resultados `sanction_imposed` / `sanction_revoked` para el Team afectado y para la
organización, en la transacción del comando (ADR-0008). El motivo no viaja al feed: se queda
en la sanción. `SanctionActivity` en `apps/api` es el punto de extensión para el correo de
MAIL-01: recibe la sanción ya guardada y decide destinatarios; el correo se añadirá ahí sin
cambiar los casos de uso.

## Consecuencias

- La tabla pública y la privada muestran los mismos puntos: la deducción vive en el snapshot,
  no en una corrección al leer.
- Una tabla guardada antes de esta decisión no tiene `pointsDeducted`; se lee como 0 hasta la
  siguiente reconstrucción.
- Imponer o revocar una deducción cuesta una reconstrucción completa de estadísticas de la
  competición. Es aceptable por su frecuencia.
- El desempate «menos sanciones» de DEC-014 sigue pendiente.

## Alternativas consideradas

- **Bounded context `discipline` nuevo.** Añade un paquete, permisos y composición para un
  agregado que solo vive dentro de una competición.
- **Sanciones en `results`.** `results` decide qué partidos cuentan; una advertencia o una
  suspensión no tiene que ver con eso. La derrota administrativa sí lo tendrá cuando exista
  el walkover, y entonces `results` lo resolverá con su propio flujo.
- **Aplicar la deducción al leer la tabla.** Evita reconstruir, pero el portal público lee el
  snapshot directamente y mostraría otros puntos.
- **Borrado lógico con `deleted_at`.** Pierde quién revocó y por qué.

## Estado de implementación y evidencia

- Dominio, casos de uso y permisos en `@futrob/competitions` (`competition-sanction.ts`,
  `application/sanctions/`).
- Migración `0066_competition_sanctions.sql`; adapter Postgres y en memoria en
  `apps/api/src/adapters/competitions/sanction.repositories.ts`, con pruebas de contrato.
- Deducción en `buildCompetitionStandings` y bridge `SanctionPointDeductionReader`.
- Rutas `/organizations/{organizationId}/competitions/{competitionId}/sanctions` y
  `/teams/{teamId}/sanctions`, SDK, BFF, página **Sanciones** y sección en **Mi equipo**.
- Pendiente: correo (MAIL-01), derrota administrativa aplicada a la tabla, desempate por
  sanciones (DEC-014) y vista móvil.
