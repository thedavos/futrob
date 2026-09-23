# ADR-0001: Topología de despliegue y responsabilidades por runtime

- Estado: Aceptada
- Fecha: 2026-07-10
- Actualizada: 2026-09-22
- Reemplaza: [ADR-0009](/docs/adr/0009-cloudflare-workers-topology.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Futrob necesita clientes web y nativo, autenticación, API de producto y sincronización
con EA. Se conserva el monorepo npm, pero se separan los runtimes según su responsabilidad.
Esta revisión consolida ADR-0009 e incorpora la extracción de auth de ADR-0015.

## Decisión

| Unidad        | Runtime y responsabilidad                                                      | Persistencia / dependencia                                                                         |
| ------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `apps/web`    | TanStack Start en Cloudflare Workers; UI, BFF, proxy auth, Queues/Cron         | SDK hacia API, binding `AUTH_SERVICE`, D1 para lookup de actor y rate limits; binding R2 de medios |
| `apps/auth`   | Worker Better Auth; credenciales, sesiones y provisionamiento de actores       | D1; única historia de migraciones compartida                                                       |
| `apps/api`    | Hono/Node en Railway; composición de casos de uso, API de producto y egress EA | Postgres mediante `DATABASE_URL`                                                                   |
| `apps/mobile` | React Native + Expo; cliente autenticado                                       | SDK al BFF con token de sesión; auth al Worker; SecureStore                                        |
| `apps/cli`    | Herramienta local de dominio/API                                               | Fakes o API según el comando; no es deployable de producto                                         |

El BFF autentica al cliente y llama a la API de producto; no instancia los adapters de
producto ni duplica sus casos de uso. Ver [contrato HTTP](/docs/adr/0005-typed-private-api.md),
[módulos](/docs/adr/0002-hexagonal-feature-modules.md) y
[auth](/docs/adr/0015-auth-extraction.md).

### Sincronización y recuperación

El ledger de jobs pertenece a la API/Postgres. Web persiste el job mediante la API
antes de publicar sus identificadores en `JOB_QUEUE`. Persistir y publicar son dos
operaciones, no una transacción distribuida: Cron llama al runner de recuperación
para recoger trabajo pendiente si falla o se interrumpe la publicación.

La API controla deduplicación, leases, intentos y disponibilidad. El consumer web
solicita la ejecución por HTTP y decide ack/retry a partir del estado devuelto. La
configuración contempla una dead-letter queue. El protocolo tolera redelivery; no
promete exactly-once. La durabilidad requiere Postgres, no los stores locales en memoria.

Este circuito de sincronización no constituye el outbox de eventos de dominio.
La consistencia de resultados y estadísticas se define en
[ADR-0016](/docs/adr/0016-official-results-transactional-projection.md).

No se añade `apps/worker` mientras no haya evidencia de límites o necesidades de
operación que justifiquen otro deployable. La UI obtiene frescura mediante refetch
autorizado; señales adicionales no sustituyen la API como fuente de verdad.

## Consecuencias

- Web/auth y API tienen despliegues y configuración separados; preview y producción
  deben aislar bases, buckets, colas y secretos. Este ADR no certifica ese aislamiento desplegado.
- Las migraciones se ejecutan fuera del request path: D1 en `apps/auth/migrations`,
  Postgres en `apps/api/migrations`.
- El modo API sin `DATABASE_URL` es útil localmente, pero pierde datos al reiniciar.
- Cambiar de runtime no mueve el dominio fuera de los packages.

## Alternativas descartadas

Un único runtime Worker para todo el producto; duplicar adapters EA entre web y API;
Vercel/Supabase como plataforma obligatoria; crear otro worker sin necesidad medida.

## Estado de implementación y evidencia

La topología y el protocolo de jobs están cableados en el repositorio. La salud de
servicios desplegados requiere comprobación independiente.

- [Bindings web](/apps/web/wrangler.jsonc) y [auth](/apps/auth/wrangler.jsonc).
- [Productor de jobs](/apps/web/src/workers/provider-sync-job.producer.ts) y
  [consumer/recuperación](/apps/web/src/workers/game-data-sync.worker.ts).
- [Ledger Postgres](/apps/api/src/adapters/game-data/jobs/postgres-provider-sync-job.repository.ts).
- [Operación de la API](/apps/api/README.md).
