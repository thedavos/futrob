# ADR-0016: Proyección transaccional de resultados oficiales

- Estado: Aceptada
- Fecha: 2026-09-22
- Relacionado: [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md) · [ADR-0011](/docs/adr/0011-tagged-errors.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Aprobar o anular un resultado y actualizar sus estadísticas son operaciones de BC
separados, pero una falla intermedia no debe dejar proyecciones competitivas incoherentes.
Este ADR formaliza la composición ya existente; no introduce un bus de eventos nuevo.

## Decisión

La API compone los casos de uso públicos de results y statistics dentro de
`TransactionPort.runInTransaction`, con exclusión por Encounter. Cada BC conserva
la propiedad de sus escrituras. La proyección se ejecuta después de confirmar el
resultado o registrar su anulación, y recibe el identificador del resultado.

```text
API composition → transacción → lock de Encounter
  → confirmar/anular resultado
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

### Avance y reversión del bracket: ampliación pendiente

La tarea [Avance ganador / clasificado / bracket](https://app.notion.com/p/3dc7b204009a815ab937c60cd28edf19)
requiere resolver los slots `winner`, `group-rank` y `stage-rank` después de oficializar
resultados. La composición actual no ejecuta ese avance ni su reversión. Esta sección
registra el alcance y las decisiones pendientes; la atomicidad aceptada arriba sigue
limitada a results + statistics.

Scheduling conserva la escritura del fixture y expone sus casos de uso públicos.
Results conserva el resultado oficial y statistics sus proyecciones. La API coordina
esos contratos mediante ports/bridges conforme a ADR-0002; results no escribe tablas
de scheduling. Una liga sin eliminatorias no debe producir avances de bracket; un bye
no debe inventar un marcador. DEC-017 exige aplicar el desempate configurado y, si
faltan datos, solicitar revisión del organizador sin elegir por seed.

Antes de implementar se debe resolver y registrar:

| Decisión pendiente            | Opciones y garantía que debe verificarse                                                                                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consistencia del avance       | Incorporar scheduling a la transacción existente, o usar procesamiento eventual con outbox atómico, reintentos y estado pendiente visible. El publisher actual no entrega eventos.                                                                          |
| Clasificación por grupo/stage | Definir cuándo es definitiva y qué versión de resultados/proyección habilita el avance; una tabla provisional no basta.                                                                                                                                     |
| Concurrencia                  | Dos encuentros distintos pueden alimentar el mismo destino. El lock por Encounter no prueba exclusión sobre ese destino; definir locks ordenados o control de versiones para escrituras compartidas.                                                        |
| Anulación y corrección        | Restaurar un placeholder solo si el destino sigue siendo reversible. Definir bloqueo o resolución explícita cuando existen encuentros posteriores jugados, resultados oficiales o decisiones dependientes. No borrar resultados posteriores implícitamente. |
| Idempotencia y procedencia    | Conservar origen del slot y versión oficial aplicada para repetir, reconstruir o revertir sin duplicar avances ni permitir que un evento antiguo sobrescriba una corrección.                                                                                |
| Empate pendiente de revisión  | Definir si la oficialización queda bloqueada o si se confirma con avance pendiente; mantener coherentes API, UI y estrategia transaccional.                                                                                                                 |

La opción transaccional aprovecha el executor existente, pero amplía los locks y las
escrituras. La eventual desacopla el trabajo, pero exige entrega durable y reconciliación
que todavía no existen. Ninguna queda aceptada por esta ampliación. Las reglas
competitivas permanecen en producto; este ADR documenta su consistencia entre contextos.

La implementación deberá comprobar aprobación repetida, clasificación provisional,
empate sin dato de desempate, fallo de avance, anulación antes y después de actividad
posterior, corrección seguida de un evento antiguo y dos resultados concurrentes sobre
el mismo destino. En la opción transaccional, un fallo posterior a una escritura debe
causar rollback de todos los participantes; en la eventual, debe persistir trabajo
recuperable y evitar presentar el avance como completado.

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

Verificar aprobación, anulación, fallo de proyección con rollback, repetición y
concurrencia sobre un Encounter al modificar este límite.
