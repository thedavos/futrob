# ADR-0025: Planes, entitlements y cupos en el BC billing

- Estado: Aceptada
- Fecha: 2026-10-29
- Relacionado: [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md) · [ADR-0011](/docs/adr/0011-tagged-errors.md) · [ADR-0013](/docs/adr/0013-ea-egress-api-only.md) · [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md) · [ADR-0021](/docs/adr/0021-auth-and-actors-in-product-postgres.md)
- Reemplaza: DEC-050 de [open-decisions](/product/open-decisions.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Toda organización usaba todo sin límites. No había forma de diferenciar planes, de acotar
el coste del egress a EA ni de cumplir FR-17 / AC-ANA-001 (analíticas premium protegidas).
DEC-050 proponía un único plan free con un flag de analytics; el producto define ahora
Gratis, Pro y Liga por organización y un add-on Jugador Premium por actor
([pricing-plans](/product/pricing-plans.md)). La aceptación se basa en la instrucción
explícita del producto para la Fase 0; no implica despliegue ni proveedor de pagos.

## Decisión

### Ownership

`packages/billing` es un BC hoja (solo `@futrob/shared-kernel`). Posee el catálogo de
planes, las suscripciones, la resolución de entitlements, el ledger de cupos y la auditoría
de cambios de plan. Ningún BC importa `@futrob/billing`: cada consumidor declara un port con
su propio vocabulario y `apps/api/src/di/` lo conecta con billing.

| Consumidor    | Port propio                    | Qué limita                                         |
| ------------- | ------------------------------ | -------------------------------------------------- |
| competitions  | `CompetitionPlanLimitsPort`    | Competiciones activas, equipos aprobados, formatos |
| organizations | `StaffSeatLimitPort`           | Staff (`organizer` + `staff`)                      |
| game-data     | `ProviderSyncQuotaPort`        | Cupo mensual de jobs de sync                       |
| statistics    | `PerformanceRankingAccessPort` | Lectura del ranking de rendimiento 0–100           |
| analytics     | `PremiumAnalyticsAccessPort`   | Gate preparado; el BC aún no tiene features        |

Estos ports no van a shared-kernel porque expresan reglas de cada contexto.

### Sujeto de la suscripción

El sujeto es una unión tipada: `organization` (planes `free`, `pro`, `league`) o `actor`
(add-on `player_premium`). Un add-on de actor nunca amplía entitlements de una organización.
Sin suscripción, o con una suscripción `canceled` o un `trialing` vencido, la organización
resuelve `free`. `past_due` conserva el plan en la Fase 0; el periodo de gracia y el corte
automático quedan para la Fase 1, junto al proveedor.

### Entitlement ≠ capacidad

Una capacidad (ADR-0017) responde si el actor puede hacer algo en un scope. Un entitlement
responde si el plan de la organización lo incluye. Los casos de uso comprueban primero la
capacidad y después el entitlement; los entitlements no se modelan como grants ni bundles.
Billing aporta sus propias capacidades: `billing.read` (organizer y staff) y
`billing.plans.assign`, solo de plataforma (superusuario), excluida del bundle de organizer.
La lectura de entitlements sin uso (para ocultar UI) exige `organizations.read`.

### Catálogo como datos

Límites, cupos y features viven en `billing_plans` (JSONB versionado), sembrado por migración.
`null` significa ilimitado. Cambiar un número es una actualización de datos, sin código.
El adapter en memoria usa `DEFAULT_PLAN_CATALOG`, y un test de integración comprueba que la
semilla de Postgres coincide con él.

### Cupos idempotentes

El cupo de sync se consume por job en `billing_quota_consumptions`, con clave única
`(organization_id, quota_key, usage_key)`; `usage_key` es el id del job. El periodo es el
mes calendario UTC del `ClockPort`. El enqueue busca primero un job activo con el mismo
`dedupeKey`: si existe, lo devuelve sin consumir. Si no, reserva cupo y encola; si una
carrera deduplica el job en el insert, la reserva se libera. En Postgres, la comprobación
de disponibilidad y la inserción se serializan por organización y periodo con un advisory lock.
Los límites de conteo (competiciones, equipos, staff) se comprueban en el consumidor con
su propio repositorio; dos altas concurrentes pueden exceder el límite en uno. Se acepta en
la Fase 0.

### Política de downgrade y cupo agotado

Solo se bloquean acciones nuevas: crear competiciones, aprobar o registrar equipos, sumar
staff, usar formatos fuera del plan y encolar syncs nuevos. Nada se borra ni se pausa. La
selección oficial, la confirmación, las disputas, la reprogramación y la oficialización no
consultan billing. Un job ya encolado se ejecuta y reintenta sin consumir de nuevo.

### Errores y wire

Billing usa `TaggedError` con códigos `billing.*` (`billing.quota_exhausted`,
`billing.feature_not_in_plan`, `billing.plan_not_found`, `billing.forbidden`,
`billing.invalid_subscription`). Cada consumidor traduce al suyo:
`competitions.plan_limit_reached`, `competitions.format_not_in_plan`,
`organizations.staff_limit_reached`, `game_data.sync_quota_exhausted` y
`statistics.performance_ranking_not_in_plan`. HTTP responde **402** para que el cliente
muestre un upsell distinto de un 403 de permisos.

### Fase 1: `PaymentProviderPort`

Billing declara `PaymentProviderPort` (checkout y portal de cliente) y define que los
webhooks del proveedor llegarán como cambios de `Subscription` con la misma auditoría.
No hay adapter: la asignación manual por superusuario es el único escritor en la Fase 0.

### Venta solo en web

La compra y el upgrade se ofrecen solo en web. Mobile lee entitlements para ocultar lo que
no aplica y no muestra CTA de compra ni enlaces a precios, para no infringir las reglas de
compras dentro de la app de App Store y Google Play.

### Espacio personal del jugador

«Mis partidos» lee `ListPlayerRecentProviderMatchesUseCase`, que consulta el proveedor por
el registry con alcance de actor, sin `organizationId` ni jobs de sync. No consume cupo de
ninguna organización. Si su coste lo requiere, se limitará con el entitlement del actor
(`player_premium`), nunca con el cupo de una organización.

## Consecuencias

- FR-17 tiene un mecanismo verificable en backend; AC-ANA-001 queda cubierto para el ranking
  y preparado para analytics.
- Las rutas que crean recursos pueden responder 402; web y SDK deben tratarlo como upsell.
- La auditoría de plan (NFR-05) es append-only en `billing_plan_changes`.
- Sin outbox durable, un cambio de plan no notifica a nadie; la UI lo lee al cargar.

## Alternativas consideradas

- **Entitlements como grants de ADR-0017:** mezcla quién puede con qué incluye el plan y
  haría que un deny de plan dependiera de la precedencia de capas. Descartada.
- **Constantes en código por plan:** obliga a desplegar para ajustar hipótesis de coste. Descartada.
- **Contar jobs en `provider_sync_jobs`:** acopla billing a tablas de game-data y no
  distingue reintentos de jobs nuevos con claridad. Descartada a favor del ledger.
- **Bloquear la selección oficial al agotar cupo:** cobraría por la integridad competitiva. Descartada.

## Cuestiones pendientes

- **Revisión manual de FR-09 (bloqueo):** la oficialización exige `ProviderMatch` asociados
  como candidatos. `ManualGameDataAdapter.getRecentMatches` no está implementado y no existe
  carga manual de resultados. Con el cupo agotado, un Encounter con candidatos ya
  sincronizados se oficializa igual, pero uno sin datos de proveedor no tiene camino
  manual. No se inventa un atajo; se resuelve en results/game-data.
- **Sync automático y prioritario:** son features del catálogo, pero no existe un
  programador automático ni prioridad en la cola. Hoy todo sync es manual.
- **Notificaciones por email, anuncios y branding del portal:** entitlements modelados, sin consumidor.
- **Periodo de gracia en `past_due`** y zona horaria de la organización para el periodo de cupo.
- **Límites de conteo estrictos bajo concurrencia** si el exceso en uno deja de ser aceptable.

## Estado de implementación y evidencia

Implementado en el checkout (Fase 0). Sin despliegue ni proveedor de pagos.

- Dominio y casos de uso: [`packages/billing`](/packages/billing/src/index.ts); gates en
  [competitions](/packages/competitions/src/domain/ports/competition-plan-limits.port.ts),
  [organizations](/packages/organizations/src/domain/ports/staff-seat-limit.port.ts),
  [game-data](/packages/game-data/src/domain/ports/provider-sync-quota.port.ts),
  [statistics](/packages/statistics/src/domain/ports/performance-ranking-access.port.ts) y
  [analytics](/packages/analytics/src/domain/ports/premium-analytics-access.port.ts).
- Persistencia: [migración 0060](/apps/api/migrations/0060_billing_plans_and_entitlements.sql) y
  [adapters](/apps/api/src/adapters/billing/), con un contrato compartido memoria/Postgres que
  incluye consumo concurrente; la semilla del catálogo se compara con `DEFAULT_ORGANIZATION_PLANS`.
- Composición: [billing.module](/apps/api/src/di/billing.module.ts) y
  [bridges](/apps/api/src/adapters/billing/plan-limit.bridges.ts); prueba de composición en
  [billing-plan-limits.composition.test.ts](/apps/api/src/di/billing-plan-limits.composition.test.ts)
  y oficialización con cupo agotado en
  [official-selection.quota-exhausted.composition.test.ts](/apps/api/src/di/official-selection.quota-exhausted.composition.test.ts).
- HTTP: [rutas de billing](/apps/api/src/http/routes/billing.ts), 402 en
  [errors.ts](/apps/api/src/http/errors.ts) y
  [contrato](/apps/api/src/http/routes/billing.contract.test.ts). Smoke en vivo:
  `npm run cli -- billing-smoke --actor <organizer> --superuser <superuser>`.
- Web: página «Plan y uso» (`/orgs/:orgId/settings/plan`), estados de upsell y `/pricing`.
  Mobile solo lee entitlements (fail-closed) y no ofrece compra.
- Pendiente de prueba en navegador con `verify-futrob` sobre un stack propio.
