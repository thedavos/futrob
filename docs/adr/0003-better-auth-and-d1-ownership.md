# ADR-0003: Ownership de Better Auth y D1

- Estado: Reemplazada
- Reemplazada el: 2026-09-22
- Reemplazada por: [ADR-0015](/docs/adr/0015-auth-extraction.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

Este ADR se conserva para mantener la historia y los enlaces existentes. Su contenido
original no prescribe la implementación actual; consultar la decisión sucesora.

## Registro histórico

- Estado original: Aceptada
- Fecha: 2026-07-17
- Reemplaza: ADR-0003 Better Auth + Supabase (retirado con el pivot de plataforma)

## Vigencia de la topología

La ubicación de adapters y persistencia descrita abajo refleja la decisión original. Para implementar cambios, rige la [arquitectura actual](/docs/architecture/overview.md): dominio/application en `packages/<bc>`, composición y Postgres de producto en `apps/api`, egress EA exclusivo de esa API ([ADR-0013](/docs/adr/0013-ea-egress-api-only.md)), auth/actores y migraciones D1 en `apps/auth` ([ADR-0015](/docs/adr/0015-auth-extraction.md)). Se mantienen las reglas de separación de dominio y autorización con scoping de organización.

## Contexto

Se necesita autenticación web moderna y autorización multi-tenant por organización/competición/equipo. Cloudflare D1 es el SQL primario. No se usa Supabase Auth.

## Decisión

- Better Auth posee credenciales, sesiones, verificaciones y tablas de autenticación en D1.
- Futrob posee `Actor`, `IdentitySubject`, organizations, memberships, roles y permisos.
- `(provider, subject)` se resuelve a `ActorId` estable.
- No se usa el plugin de organizations de Better Auth como modelo de negocio.
- La sesión demuestra identidad; los use cases determinan autorización.

## Consecuencias

- Schema auth y negocio coexisten en D1 con ownership claro.
- Migraciones auth siguen el flujo Wrangler D1 junto al schema de producto.
- Los aggregates nunca referencian tablas de Better Auth directamente.

## Alternativas rechazadas

- Supabase Auth / Postgres RLS como autoridad.
- JWT con roles embebidos editables por el cliente.
- Organizations plugin de Better Auth como tenant model.
