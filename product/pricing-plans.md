# Futrob — Planes y entitlements

**Estado:** Fase 0 (sin proveedor de pagos). **Decisión:** [ADR-0025](/docs/adr/0025-billing-plans-and-entitlements.md).
**Reemplaza:** DEC-050 en [open-decisions](/product/open-decisions.md). **Cubre:** FR-17, AC-ANA-001.

## Planes de organización

| Entitlement                       | Gratis (`free`)           | Pro (`pro`)           | Liga (`league`)                              |
| --------------------------------- | ------------------------- | --------------------- | -------------------------------------------- |
| Competiciones activas             | 1                         | 5                     | Ilimitadas                                   |
| Equipos por competición           | 12                        | 32                    | Ilimitados                                   |
| Formatos                          | Liga, eliminación directa | Todos los del MVP     | Todos                                        |
| Sync con el proveedor (jobs/mes)  | 60                        | 600 + sync automático | 5000 de uso justo, prioritario               |
| Staff por organización            | 2                         | 10                    | Ilimitado                                    |
| Ranking de rendimiento 0–100      | No                        | Sí                    | Sí                                           |
| Analíticas premium equipo/jugador | No                        | Sí                    | Sí                                           |
| Analítica de organizador          | No                        | Básica                | Completa                                     |
| Portal público                    | Marca Futrob              | Logo y colores        | Branding avanzado (sin white-label, WONT-03) |
| Notificaciones                    | Web                       | Web + email           | Web + email + anuncios                       |

Los números son **datos del catálogo** (`billing_plans` en Postgres), no constantes de código.
Los cupos de sync son hipótesis de coste: cambiarlos es una actualización de datos auditable.

## Add-on personal

**Jugador Premium** (`player_premium`) pertenece a un Actor, no a una organización. En la Fase 0
solo existe el plan y su entitlement (`playerPremiumInsights`); sus features no están construidas.

## Reglas

1. **Nunca se cobra por la integridad competitiva.** Selección oficial, confirmación, disputas,
   reprogramación y oficialización funcionan igual en todos los planes.
2. **Downgrade o cupo agotado** solo bloquean acciones nuevas: crear competiciones, sumar equipos o
   staff, encolar syncs nuevos. Las competiciones en curso terminan igual.
3. **Cupo de sync agotado:** el enfrentamiento se resuelve con los candidatos ya sincronizados.
   La revisión manual de FR-09 sin datos de proveedor **no existe todavía** (ver ADR-0025, cuestiones pendientes).
4. **Un job deduplicado no consume cupo:** reintentos y dobles clics no cobran dos veces.
5. **El espacio personal del jugador** («Mis partidos») no consume cupo de ninguna organización.
6. **Venta solo en web.** Mobile lee entitlements para ocultar lo que no aplica, sin CTA de compra.

## Definiciones operativas (defaults de la Fase 0)

- **Competición activa:** cualquier estado distinto de `finished` y `archived` (incluye `draft`).
- **Staff:** membresías de organización con rol `organizer` o `staff`.
- **Periodo de cupo:** mes calendario UTC.
- **Equipos por competición:** inscripciones aprobadas; el cupo efectivo es el menor entre el límite del plan y el `max` de la competición.
