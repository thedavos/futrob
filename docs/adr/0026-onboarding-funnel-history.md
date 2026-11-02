# ADR-0026: Historial del embudo de onboarding en identity

- Estado: Propuesta
- Fecha: 2026-11-02
- Relacionado: [ADR-0010](/docs/adr/0010-bounded-context-packages.md) · [ADR-0021](/docs/adr/0021-auth-and-actors-in-product-postgres.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

`actor_onboarding` guarda solo el último camino y paso de cada actor (DEC-075). Con eso
no se puede medir el embudo de los tres caminos: cuántos actores llegan a cada paso,
dónde abandonan y cuánto tardan en completar. El producto necesita esas cifras para
priorizar cambios del onboarding. AC-ONB-001 limita lo que identity puede guardar a
camino, paso, versión y finalización; los borradores no se persisten. El repositorio no
tiene telemetría de producto ni proveedor de analítica externo, y el BC `analytics` trata
analíticas premium de competición.

## Decisión propuesta

identity añade un historial append-only en `actor_onboarding_events`, en el mismo
Postgres de producto. Cada fila tiene `actor_id`, `kind` (`step-entered` o `completed`),
camino, paso, versión del flujo y `occurred_at`. No guarda borradores, códigos de
invitación ni datos de juego.

- El adapter escribe estado e historial en una sola sentencia (CTE), así que ambos
  quedan en la misma transacción.
- `step-entered` se registra solo cuando camino o paso cambian respecto del estado
  guardado. Repetir o reintentar el mismo paso no añade filas ni actualiza `updated_at`.
- `completed` se registra una vez, en la transición a completado.
- `OnboardingProgress.version` lleva `CURRENT_ONBOARDING_VERSION`, de modo que el embudo
  se puede separar por revisión del flujo.

Consulta de referencia para el embudo por camino y versión:

```sql
SELECT onboarding_version, onboarding_path, kind, onboarding_step,
       COUNT(DISTINCT actor_id) AS actors
FROM actor_onboarding_events
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3, 4;
```

## Consecuencias

- El embudo se calcula con SQL sobre la base de producto, sin enviar datos a terceros.
- El historial crece con cada transición (un actor típico genera de 4 a 6 filas).
- Las filas no se borran al borrar un actor: la FK es `ON DELETE RESTRICT`, igual que el
  resto de referencias a `actors`.
- Los clientes no cambian; el registro ocurre en `PATCH /api/v1/identity/onboarding` y en
  los tres endpoints de finalización que ya llaman a `CompleteOnboardingUseCase`.

## Alternativas consideradas

- Logs estructurados en Railway: sin migración, pero no se pueden consultar como tabla
  ni conservar con la retención de la base.
- Proveedor externo de analítica: requiere decisión de privacidad y un contrato nuevo, y
  el embudo solo necesita datos que ya están en identity.
- Eventos de dominio hacia `analytics`: no existe outbox general (ADR-0008 lo deja
  pendiente) y `analytics` no posee telemetría de producto.

## Cuestiones pendientes

- Registrar en `completed` si el actor declaró cuenta EA y el resultado de la asociación
  de club, para medir la tasa de «Omitir». Depende de que la orquestación de la
  finalización salga del handler HTTP.
- Retención del historial.

## Estado de implementación y evidencia

- Migración: [0062_actor_onboarding_events.sql](/apps/api/migrations/0062_actor_onboarding_events.sql).
- Adapter: [postgres-actor-onboarding.repository.ts](/apps/api/src/adapters/identity/postgres-actor-onboarding.repository.ts).
- Contrato del port: [actor-onboarding.port.ts](/packages/identity/src/domain/ports/actor-onboarding.port.ts).
- Prueba contra Postgres real y en memoria:
  [actor-onboarding.repositories.test.ts](/apps/api/src/adapters/identity/actor-onboarding.repositories.test.ts),
  ejecutada en local con Postgres 16.
