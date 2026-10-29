# ADR-0016: Proyección transaccional de resultados oficiales

- Estado: Aceptada
- Fecha: 2026-09-22
- Actualización: 2026-10-29
- Relacionado: [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md) · [ADR-0011](/docs/adr/0011-tagged-errors.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Aprobar o anular un resultado y actualizar sus estadísticas son operaciones de BC
separados, pero una falla intermedia no debe dejar proyecciones competitivas incoherentes.
Este ADR formaliza la composición ya existente; no introduce un bus de eventos nuevo.

## Decisión

La API compone los casos de uso públicos de results y statistics dentro de
`TransactionPort.runInTransaction`, con exclusión por competición y Encounter
para operaciones que aprueban o anulan resultados. Cada BC conserva
la propiedad de sus escrituras. La proyección se ejecuta después de confirmar el
resultado o registrar su anulación, y recibe el identificador del resultado.

```text
API composition → transacción → lock de competición → lock de Encounter
  → confirmar/resolver/anular resultado
  → proyectar estado del resultado en statistics
  → commit si se completa; rollback ante excepción
```

El adapter Postgres propaga el cliente transaccional mediante AsyncLocalStorage y
los repositories participantes deben usar `getPgExecutor`. El lock Postgres usa
`pg_advisory_xact_lock`: su garantía depende de ejecutarse dentro de esa transacción.
Una transacción anidada reutiliza el contexto; no crea un savepoint independiente.

El wrapper hace commit cuando el callback retorna, incluso si retorna `Result.err`.
La composición actual retorna los fallos esperados de confirmación/anulación antes
de proyectar y lanza el TaggedError de proyección cuando falla después de una mutación.
Así activa rollback sin reclasificar una falla esperada como Panic. Un cambio que
pueda escribir antes de retornar un error debe revisar este comportamiento explícitamente.

Los adapters in-memory y `NoopTransactionPort` no ofrecen rollback durable ni exclusión
entre procesos. Sus tests no demuestran atomicidad de Postgres.

### Ranking de rendimiento de equipos (2026-09-30)

Statistics conserva un snapshot distinto de standings y de rankings de jugador.
La composición de aprobación/anulación adquiere primero el lock transaccional de
la competición (`statistics:team-performance:{competitionId}`) y después el de
Encounter. Proyección directa, rebuild del ranking y rebuild total usan el mismo
lock, antes de leer fuentes; las operaciones anidadas reutilizan la transacción.
Así dos encuentros distintos no pueden reemplazar el snapshot con lecturas parciales
del conjunto comparable. El repository además compara el fingerprint esperado al
reemplazar. No ordena fuentes por `updatedAt` ni por máximo de revisiones.

El rebuild se llama directamente y queda dentro de la transacción compartida:
un fallo del cálculo/persistencia después de escribir causa rollback del resultado,
contribuciones y snapshots. El rebuild total lanza errores de proyección después
de mutar, pues retornar `Result.err` haría commit. Las ausencias legítimas de métricas
persisten como `incomplete`; no impiden oficializar un resultado válido.

La memoria ofrece exclusión reentrante por proceso; sigue sin garantizar rollback.
Los adapters Postgres del ranking requieren contexto transaccional. Las lecturas
validan scope, consultan adapters propios y el reader público de Results, y obtienen
tiempo de los slots oficiales. Versiones y reglas: [contrato de producto](/product/team-performance-v1.md).

### Eventos y evolución

`results.official-result-approved` identifica la transición que habilita estadísticas
oficiales. El publisher actual de dominio es `NoopEventPublisher`; la proyección se
produce por la composición explícita, no por un consumer de ese evento.

La sincronización de proveedores no oficializa resultados. Su Queue no es un outbox
de dominio. [Notificaciones](/docs/adr/0008-notifications-web-and-email.md) sigue pendiente.

Una migración futura a consistencia eventual requerirá decidir la persistencia atómica
de evento/resultado, idempotencia de consumidores, reintentos, orden/versiones,
reconstrucción y tratamiento visible de proyecciones pendientes. No basta sustituir
la llamada a statistics por `publish()`.

### Selección, disputas y resolución

Todos los comandos de selección usan esta composición: transacción, lock de Encounter, comando y, solo si
el comando aprobó un resultado y no es un replay, la proyección de statistics con rollback si falla.
Los comandos de confirmación rival, alternativa y resolución de disputa adquieren primero el lock de
competición del ranking y después el de Encounter, igual que la anulación. Una alternativa equivalente
puede aprobar como confirmación rival; por eso usa el mismo orden incluso si luego resulta incompatible.
Rechazos y revisiones no proyectan. La escritura de la selección, sus propuestas, su auditoría,
la disputa y las reservas de referencias es una sola
operación del repositorio (compare-and-swap de versión, con savepoint dentro de la transacción exterior);
el resultado aprobado se añade después de ese commit y una falla posterior revierte todo. `OfficialResult`
pasa a ser append-only: una revisión nueva se inserta y nunca reemplaza a otra. Detalle y matriz en
[selección oficial](/docs/architecture/results-selection-disputes.md).

### Avance y reversión del bracket (2026-10-29)

La tarea [Avance ganador / clasificado / bracket](https://app.notion.com/p/3dc7b204009a815ab937c60cd28edf19)
resuelve los slots `winner`, `group-rank` y `stage-rank` después de oficializar resultados.
Scheduling conserva la escritura del fixture con `AdvanceFixtureFromOfficialResultUseCase`.
Lee los marcadores aprobados mediante su propio port (`OfficialEncounterScoreReaderPort`),
que la API conecta con el repositorio de results. Results no escribe tablas de scheduling.

| Decisión                      | Resolución aceptada                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consistencia del avance       | Transaccional. Los comandos que aprueban y la anulación ejecutan el avance después de proyectar statistics, en la misma transacción. Un fallo del avance lanza y revierte resultado, proyección y slots. No hay outbox ni estado eventual.                                                                                                                    |
| Idempotencia y procedencia    | El avance es una reconciliación. Calcula el estado deseado de cada slot derivado a partir de los resultados aprobados actuales y escribe solo la diferencia. Repetirlo no escribe nada. Un evento antiguo no puede sobrescribir una corrección porque no se usa el payload del evento. El slot `team` avanzado guarda su placeholder en `advancedFrom`.       |
| Clasificación por grupo/stage | Es definitiva cuando todos los encuentros Team contra Team del grupo o stage tienen un resultado aprobado. Ordena por puntos de la etapa regular, diferencia de goles y goles a favor. Un empate que toca el puesto pedido va a revisión, porque los criterios restantes de DEC-014 no están modelados.                                                       |
| Concurrencia                  | Aprobaciones y anulaciones de una competición ya se serializan con el lock transaccional de competición (`statistics:team-performance:{competitionId}`) antes del lock de Encounter. Por eso dos encuentros que alimentan el mismo destino no escriben a la vez. La revisión del plan actúa además como compare-and-swap. Un conflicto revierte la operación. |
| Anulación y corrección        | Un destino vuelve a su placeholder solo si sigue siendo reversible, es decir, sin selección activa ni resultado oficial. Si no lo es, la anulación falla con `scheduling.advancement_not_reversible` y se revierte. Hay que anular primero los encuentros posteriores. Nunca se borran resultados posteriores.                                                |
| Empate pendiente de revisión  | La oficialización no se bloquea. El resultado empatado se aprueba, el destino conserva su placeholder y el caso de uso devuelve `scheduling.tie_requires_organizer_review` sin escribir slots. La composición trata ese error como pendiente y no revierte.                                                                                                   |

Un bye nunca recibe marcador. El ganador de un encuentro Team contra bye es el Team, sin
resultado oficial. Una liga sin slots derivados no lee resultados ni escribe el fixture.
Cuando ambos lados de un destino quedan resueltos, el avance crea su serie con el modo de
la etapa de eliminación y proyecta el Encounter y sus OfficialMatch. Al revertirlo, borra
el snapshot del Encounter y Postgres elimina sus OfficialMatch en cascada.

En la ruta de aprobación, `scheduling.advancement_not_reversible` solo aparece si un resultado
cambia de ganador sin anularse antes. Results no ofrece ese flujo, así que se trata como defecto:
lanza y revierte. La memoria sigue sin rollback; la reversión se prueba en Postgres.

Pendiente: un comando para que el organizador resuelva un empate, la visualización del
estado «pendiente de revisión» y el resto de criterios de DEC-014 (enfrentamiento directo,
sanciones, sorteo auditado).

## Consecuencias

- La API coordina atomicidad sin que results escriba tablas de statistics.
- Cambiar repositories participantes exige comprobar que usan el mismo executor.
- Reintentar requiere idempotencia de negocio; el lock no equivale a exactly-once.
- Un publisher no-op no ofrece notificaciones ni replay de eventos de dominio.

## Alternativas descartadas

Escrituras directas a tablas ajenas; proyección fuera de transacción sin recuperación;
asumir rollback por retornar un Result; delegar a un consumer todavía inexistente.

## Estado de implementación y evidencia

La composición existe en el código. Su garantía operativa requiere Postgres y tests
que ejerciten los adapters participantes; este ADR no declara una ejecución E2E nueva.

- [Confirmación y anulación compuestas](/apps/api/src/di/create-modules.ts).
- [Transaction adapter](/apps/api/src/adapters/persistence/pg-transaction.ts) y
  [tests](/apps/api/src/adapters/persistence/pg-transaction.test.ts).
- [Lock de Encounter](/apps/api/src/adapters/scheduling/encounter-mutation-lock.ts).
- [Slots del fixture](/packages/scheduling/src/domain/entities/fixture-plan.ts) y
  [decisiones de producto, incluyendo DEC-017](/product/open-decisions.md).
- [Reconciliación del avance](/packages/scheduling/src/domain/policies/reconcile-fixture-advancement.ts),
  [caso de uso y tests](/packages/scheduling/src/application/advance-fixture-from-official-result/),
  [composición](/apps/api/src/di/official-selection.commands.ts) y
  [tests en memoria y Postgres](/apps/api/src/di/fixture-advancement.composition.test.ts).

Verificar aprobación, anulación, fallo de proyección con rollback, repetición y
concurrencia sobre un Encounter al modificar este límite.
