# ADR-0027: Sistema suizo con rondas emparejadas por reconciliación

- Estado: Aceptada
- Fecha: 2026-11-06
- Actualizado: 2026-11-06 (emparejamiento, regla de retirada y selección abierta, según lo construido)
- Relacionado: [ADR-0016](/docs/adr/0016-official-results-transactional-projection.md) ·
  [ADR-0024](/docs/adr/0024-anonymous-public-portal-reads.md) ·
  [ADR-0025](/docs/adr/0025-billing-plans-and-entitlements.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

Base de la aceptación: el dueño del producto decidió construir el formato, lo incluyó en Pro y
Liga y delegó estas decisiones de ejecución en el encargo de implementación.

## Contexto

Los formatos existentes generan el calendario completo con `generateFixturePlan(spec)`. Los slots
que dependen de resultados (`winner`, `group-rank`, `stage-rank`) ya existen como encuentros con
placeholders, y `AdvanceFixtureFromOfficialResultUseCase` los reconcilia dentro de la transacción
de aprobación.

En un suizo no se sabe de antemano ni quién juega ni cuántas mesas tiene una ronda, porque una
retirada cambia la paridad. Tampoco existe hoy retirada de un equipo, ni cierre de un partido sin
resultado: `walkover_intended` no crea resultado oficial y la revisión manual de FR-09 no está
construida. Sin una salida operativa, un solo partido sin jugar bloquearía la competición.

## Decisión

### 1. Generación y disparo de cada ronda

Un plan suizo tiene una etapa `swiss` con todas sus rondas desde el primer momento. Cada ronda
guarda número y fecha prevista. Solo la ronda 1 nace con encuentros; las demás nacen vacías.
Una ronda vacía significa «sin emparejar», sin columna de estado adicional.

`AdvanceFixtureFromOfficialResultUseCase` sigue siendo el único punto de entrada desde la
aprobación y la anulación. Para un plan `swiss` delega en `ReconcileSwissRoundsUseCase`, que también
usan los comandos de organizador. El caso de uso aplica cambios hasta que no queda ninguno. Cada
cambio lo decide `reconcileSwissRounds`, una política pura que recibe el plan, los marcadores
aprobados y las reglas:

| Estado observado                                                | Cambio                          |
| --------------------------------------------------------------- | ------------------------------- |
| Un encuentro sin resultado tiene un equipo retirado             | Convertirlo en bye o eliminarlo |
| Hay una ronda sin liquidar y ninguna ronda posterior emparejada | Ninguno                         |
| Hay una ronda sin liquidar y rondas posteriores ya emparejadas  | Desemparejarlas                 |
| Todas las rondas emparejadas están liquidadas y queda una vacía | Emparejar la siguiente          |
| Lo anterior, pero no existe emparejamiento legal                | Eliminar las rondas vacías      |
| Todas las rondas están liquidadas y no queda ninguna vacía      | Ninguno (final)                 |

Una ronda está liquidada cuando cada encuentro tiene resultado oficial aprobado, es un bye o se
cerró sin resultado. Un partido pendiente o reprogramado solo retrasa el cambio: no hay temporizador.

- **Solo tras oficializar.** La lectura usa `OfficialEncounterScoreReaderPort`, que devuelve
  resultados aprobados. El sync, la selección y la confirmación pendiente no emparejan.
- **Idempotencia.** El estado deseado se deriva del estado actual y no del payload de un evento.
  Una ronda emparejada no se recalcula: repetir la operación no encuentra nada que hacer. Un doble
  intento choca contra el compare-and-swap de `revision`. El id del encuentro incluye la revisión
  del plan al emparejar (`{roundId}:encounter:{mesa}:p{revision}`). Las tablas de results no tienen
  clave foránea al encuentro, así que reusar el id tras desemparejar heredaría la selección y los
  candidatos de la pareja anterior.
- **Concurrencia.** Aprobar y anular ya toman el lock de competición antes de escribir. Dos
  aprobaciones simultáneas de la última mesa se serializan y la segunda ve a la primera en
  READ COMMITTED. Retirar y cerrar ronda toman el mismo lock y después el de cada encuentro afectado
  en orden de id. Una propuesta solo toma el lock de su encuentro: o termina antes y se cancela, o
  empieza después y ya no encuentra el encuentro.
- **Anulación.** Anular un resultado desempareja las rondas posteriores si siguen siendo
  reversibles, con la misma guarda y el mismo error que el avance de bracket
  (`scheduling.advancement_not_reversible`). Una nueva aprobación vuelve a emparejar.
- **Desemparejar** borra el snapshot del encuentro, y Postgres borra en cascada sus partidos
  oficiales y solicitudes de reprogramación. Avisa por `EncounterParticipantsChangePort`.
- **Fecha.** Los encuentros usan la fecha prevista de su ronda. Si ya pasó, se adelanta en días
  enteros, conservando la hora local, hasta que quede en el futuro. El organizador la puede editar.

No se usa el outbox porque la API sigue con `NoopEventPublisher`. El evento
`scheduling.encounter-created` se publica igual que en la generación, para el consumidor futuro.

### 2. Emparejamiento y número de rondas

`pairSwissRound` es una política pura y determinista: grupos de puntos en orden de preferencia, con
una comprobación de viabilidad antes de fijar cada mesa.

1. Ordena los equipos activos por puntos y luego por `seed`. Los puntos incluyen los de bye.
2. Con número impar, prueba como bye a cada equipo de abajo hacia arriba, primero los que no han
   descansado, y se queda con el primero que deja un emparejamiento completo.
3. Elige el mejor equipo sin pareja. Prefiere un rival de su mismo grupo de puntos, empezando por
   la mitad del grupo (1 contra n/2 + 1 en la ronda 1), y después los grupos inferiores.
4. Toma el primer rival de ese orden que deja al resto emparejable. El algoritmo de blossom de Edmonds
   responde si queda un emparejamiento perfecto entre los equipos restantes. Devuelve lo mismo que un
   retroceso sobre el mismo orden. El retroceso con memoria se descartó porque tardaba 7,8 s con 50
   equipos, dentro de la transacción de aprobación.

**No hay revanchas: es un invariante duro.** Si no existe un emparejamiento completo sin revanchas,
o quedan menos de dos equipos activos, la fase termina en la ronda anterior. Local es quien ha sido local menos veces y, si empatan, el
mejor clasificado.

Rondas por defecto: `⌈log₂ n⌉`. El organizador puede elegir entre 1 y `⌊(n + 1) / 2⌋`. Con ese
máximo el teorema de Dirac garantiza un emparejamiento sin revanchas ni byes repetidos. El bye se
busca como un vértice virtual que no se repite, así que el grafo tiene n + 1 vértices y, antes de
la ronda k, grado mínimo n − k + 1, que es al menos (n + 1) / 2 para k ≤ (n + 1) / 2. Esta garantía
no sobrevive a una retirada: con retiradas, la fase puede terminar antes.

Los puntos para emparejar se calculan en scheduling a partir de los resultados oficiales y las
reglas de la etapa regular, sumando los byes con la misma fórmula que la clasificación. No se lee
statistics. Hay una diferencia conocida: statistics descarta una contribución sin equipo
correlacionado y el emparejamiento no, porque se orienta por los slots del encuentro.

### 3. Bye y retirada

- **Bye.** Se modela con el slot `bye` existente. Respeta DEC-015: sin marcador ni estadísticas.
  Esta decisión amplía DEC-015 solo para el suizo: suma los puntos de una victoria en la
  clasificación suiza (`winPoints × partidos` con `independent_matches`,
  `winPoints` con `aggregate_score`).
- **Retirada.** `WithdrawSwissTeamUseCase` guarda al equipo en `FixturePlan.withdrawnTeamIds`. Es
  un hecho de emparejamiento y vive en scheduling; la inscripción sigue `approved` porque sus
  resultados históricos, nombre y permisos dependen de ella. No se reincorpora en esta entrega.
  - Sus resultados aprobados se conservan y sigue en la clasificación, marcado como retirado.
  - Su encuentro sin resultado se convierte en bye para el rival. Se elimina si los dos equipos
    están retirados, o si el retirado tiene un bye en una ronda que aún se está jugando. El bye de
    una ronda liquidada es historia y se queda. Solo el comando de retirada convierte encuentros.
  - Anular después un resultado de un equipo retirado no convierte nada: el encuentro queda abierto
    para aprobar un resultado corregido o cerrar la ronda, y las rondas posteriores pasan por la
    guarda de reversibilidad normal. Convertirlo haría irreversible una anulación equivocada.
- **Partido sin resultado.** `CloseSwissRoundUseCase` marca los encuentros sin resultado de la
  ronda actual con `closedWithoutResult`: nadie suma puntos, no se crea resultado oficial y cuentan
  como ya enfrentados.
- **Selección abierta.** Retirar y cerrar anulan la selección no terminal del encuentro con
  `CancelOpenSelectionUseCase` de results, conectado por `EncounterOpenSelectionPort` de scheduling.
  Se registra con el actor del organizador. Si hay una disputa abierta, se resuelve como
  `returned_to_selection`. Si bloquearan, una selección abandonada dejaría la competición sin
  salida. Un resultado aprobado nunca se toca.

Ambos comandos exigen `encounters.schedule.manage` y un motivo. Dejan rastro en `swiss_round_actions`,
una tabla por plan, porque `fixture_encounter_audit` tiene una clave foránea en cascada al encuentro
y admite un solo registro por `request_id`. Repetir el mismo `requestId` no vuelve a aplicar nada.

Las parejas no se editan a mano. `EditFixtureEncounterUseCase` rechaza cambiar equipos en un plan
suizo y rechaza editar un encuentro cerrado, porque proyectarlo lo reviviría.

### 4. Clasificación

`applySwissStandings` es una política pura de statistics. Recibe el snapshot oficial y un contexto
leído por `CompetitionSwissStandingReaderPort`, un adapter de `apps/api` sobre el plan y los
resultados. No se persiste nada nuevo: se aplica **al leer**, tanto en la API privada como en el
portal público. Así un bye o una retirada, que no pasan por el rebuild, se ven al instante, y el
snapshot oficial sigue conteniendo solo resultados aprobados.
Un bye suma en la tabla cuando su ronda queda liquidada: acreditarlo antes pondría primero a un
equipo que acaba de perder, solo porque descansa en la ronda en curso.

Orden: puntos, Buchholz, diferencia de goles, goles a favor, `seed`. Este orden amplía DEC-014 solo
para el suizo. Buchholz es la suma de los
puntos finales de los rivales con resultado oficial. Cada bye suma los puntos del propio equipo,
como rival virtual, para no castigar a quien descansó. Un encuentro cerrado sin resultado no suma.
La fórmula se publica como `swiss-points-buchholz-gd-gf-v1`.

Desde el primer resultado oficial, la tabla incluye a todos los equipos del `seed`, aunque no tengan
resultados. Sin ningún resultado no hay tabla, como en los demás formatos. La clasificación es final
cuando todas las rondas restantes están liquidadas.

### 5. Fuera de esta entrega

- Playoffs tras la fase suiza. La etapa `swiss` y el slot `stage-rank` dejan el camino abierto.
- Doble eliminación y ascenso/descenso siguen excluidos.
- El paso automático de la competición a `finished`, que no existe en ningún formato.

## Consecuencias

- Los clientes deben aceptar rondas con `encounters` vacío y un encuentro `team` contra `team`
  con `series: null` y `closedWithoutResult: true`.
- El catálogo de planes cambia por migración, con `version` nueva en Pro y Liga. Gratis recibe
  `competitions.format_not_in_plan`. Un downgrade no detiene una competición en curso.
- Una ronda se queda esperando indefinidamente hasta que el organizador cierre o retire. Es
  deliberado: nunca se inventa un resultado.
- La clasificación suiza se calcula en cada lectura. Es lineal en encuentros del plan.
- Eliminar rondas vacías por falta de emparejamiento no se revierte si después se anula un
  resultado. La competición termina antes y el organizador puede generar otro plan solo si no hay
  resultados aprobados.

## Alternativas consideradas

| Alternativa                                      | Motivo del descarte                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Slot placeholder `swiss-pairing` en cada mesa    | Reutiliza `reconcileFixtureAdvancement`, pero fija el número de mesas al generar. Una retirada dejaría mesas vacías o slots `bye` que hoy no son derivables. |
| Un `FixturePlan` nuevo por ronda                 | `generation_version` y `markSuperseded` significan «reemplazar el calendario». Partiría encuentros, lecturas y la guarda de resultados aprobados.            |
| Ronda emparejada por el organizador con un botón | Evita el disparo automático, pero pierde la garantía de que el formato avanza solo y añade un paso repetitivo sin decisión real.                             |
| Evento de outbox consumido por scheduling        | El outbox no existe aún. ADR-0016 fija el avance transaccional, y un fallo debe revertir la aprobación.                                                      |
| Entrada `withdrawn` en `competition_entries`     | Toca capacidad, permisos y resolución de nombres en todos los formatos para un hecho que solo consume el emparejamiento.                                     |
| Buchholz persistido en el snapshot               | Quedaría obsoleto ante byes y retiradas, que no reconstruyen el snapshot. También mezclaría datos del plan con la proyección oficial.                        |
| Algoritmo holandés FIDE completo                 | Sus reglas de color y flotantes no aportan en FC Clubs y son difíciles de auditar. El resultado debe ser explicable al capitán.                              |
| Permitir revanchas al agotarse los rivales       | Contradice el requisito. Terminar antes es honesto y solo ocurre tras retiradas.                                                                             |

## Cuestiones pendientes

- Avisar a los capitanes cuando se empareja una ronda. Depende del outbox y de ADR-0008.
- Un sorteo manual auditado como desempate final (DEC-014) sigue sin modelar.

## Estado de implementación y evidencia

La evidencia de ejecución está en la descripción del PR que introduce este registro.

Construido en API, SDK, CLI, web y copy móvil. La web genera el calendario solo para suizo; los demás
formatos siguen sin flujo web de generación. La lectura pública devuelve los campos suizos, pero
`apps/web` aún no tiene rutas de portal público que los muestren.

Brechas: el aviso a capitanes al emparejar (cuestión pendiente arriba) y el paso automático a
`finished`, que no existe en ningún formato.

- [Política de reconciliación](/packages/scheduling/src/domain/policies/reconcile-swiss-rounds.ts) y
  [emparejamiento](/packages/scheduling/src/domain/policies/pair-swiss-round.ts).
- [Política de clasificación](/packages/statistics/src/domain/policies/apply-swiss-standings.ts).
- [Comandos de organizador](/apps/api/src/di/swiss-round.commands.ts).
- [Migración](/apps/api/migrations/0064_swiss_format.sql).
- [Calendario web](/apps/web/src/modules/scheduling/presentation/competition-fixture-page.tsx) y
  [comandos BFF](/apps/web/src/modules/scheduling/server/competition-fixture.handler.ts).
