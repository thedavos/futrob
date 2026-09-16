# ADR-0004: Multi-tenancy en D1 con scoping de aplicación

- Estado: Aceptada
- Fecha: 2026-07-17
- Reemplaza: ADR-0004 Multi-tenancy y RLS Postgres (retirado; D1 no ofrece RLS)

## Vigencia de la topología

La ubicación de adapters y persistencia descrita abajo refleja la decisión original. Para implementar cambios, rige la [arquitectura actual](/docs/architecture/overview.md): dominio/application en `packages/<bc>`, composición y Postgres de producto en `apps/api`, egress EA exclusivo de esa API ([ADR-0013](/docs/adr/0013-ea-egress-api-only.md)), auth/actores y migraciones D1 en `apps/auth` ([ADR-0015](/docs/adr/0015-auth-extraction.md)). Se mantienen las reglas de separación de dominio y autorización con scoping de organización.

## Contexto

Los datos privados (plantillas, disputas, payloads EA, selecciones) deben aislarse por organización. Postgres RLS ya no está disponible tras el cambio a D1.

## Decisión

- Composition/`context` resuelve `ActorId` y `organizationId` de confianza.
- Toda query tenant-scoped en adapters **debe** filtrar por organización (y alcance más estrecho cuando aplique).
- Use cases autorizan permisos Futrob antes de mutar.
- Lecturas públicas usan proyecciones `publication` / queries explícitas de solo lectura.
- Tests de aislamiento con al menos dos organizaciones son Must cuando exista implementación.
- No se expone D1 al browser; el Worker es el único acceso a datos.

## Consecuencias

- La correcta implementación de adapters es crítica; lint/tests deben atrapar queries sin scope.
- No hay red de seguridad tipo RLS a nivel motor SQL.
- El modelo es portable a otros SQL edge si el puerto de persistencia se mantiene.

## Alternativas rechazadas

- Confiar solo en ocultar UI.
- Un database/schema físico por tenant en el MVP.
- Reintroducir Postgres + RLS solo para tenancy.
