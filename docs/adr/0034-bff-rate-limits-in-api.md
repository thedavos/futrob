# ADR-0034: Los rate limits del BFF se cuentan en el API de producto

- Estado: Aceptada
- Fecha: 2026-11-20
- Relacionado: [ADR-0013](/docs/adr/0013-ea-egress-api-only.md) ·
  [ADR-0032](/docs/adr/0032-auth-node-runtime.md)
- Reemplaza en parte: [ADR-0021](/docs/adr/0021-auth-and-actors-in-product-postgres.md),
  punto 4 (web ya no accede a Postgres por Hyperdrive)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Después de ADR-0032, el único acceso de `apps/web` a Postgres era el limitador del BFF:
un binding de Hyperdrive con un `id` de marcador y una conexión `pg` por comprobación,
contra `app_rate_limit_windows`. Para eso, cada entorno de desarrollo necesitaba
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` en `apps/web/.env`, aunque con
`ENVIRONMENT=development` el limitador nunca se ejecuta. En producción, Railway Postgres
tenía que quedar accesible desde Hyperdrive solo por esa tabla. `apps/api` ya es dueño de
`DATABASE_URL`, de las migraciones y de la tabla.

## Decisión

1. `apps/api` cuenta los intentos. Expone `POST /internal/rate-limits/check`, autenticado
   con el secreto interno (`INTERNAL_JOB_SECRET`) y sin actor. Recibe `policy`, `actorId`
   (o `null` sin sesión) y `clientIp`, y responde `allowed` o `limited` con `limitedBy` y
   `retryAfterSeconds`. El contrato vive en `@futrob/api-contracts` y el SDK lo expone como
   `client.rateLimits.check`.
2. Las políticas, sus valores por defecto, las variables `RATE_LIMIT_<POLÍTICA>_*` y
   `RATE_LIMIT_FINGERPRINT_SECRET` pasan a `apps/api`. Actor e IP se guardan solo como HMAC
   SHA-256, igual que antes, en la misma tabla y con la misma transacción (purga e
   incremento de actor e IP en orden fijo). Sin `DATABASE_URL`, el API cuenta en memoria.
   Sin el secreto, o si el almacén falla, responde 503 `api.rate_limit_unavailable`. Un
   override `RATE_LIMIT_*` inválido conserva el valor por defecto de esa variable y se
   registra al arrancar; las demás políticas siguen igual. Los checks usan un pool propio
   de 5 conexiones, separado del pool del producto, que mantiene las conexiones abiertas 60
   s. Cada check tiene un plazo total de 2,5 s, desde pedir la conexión hasta la respuesta
   del `COMMIT`: cada sentencia espera solo lo que queda, así que un `COMMIT` lento
   aprovecha el tiempo que no usaron las anteriores. Dentro de ese plazo, 1 s para obtener
   conexión, 0,3 s por el lock de cada fila (`lock_timeout`) y 1 s por sentencia en el
   servidor; si falla, el `ROLLBACK` tiene 0,5 s más. Si la respuesta del `COMMIT` no llega
   a tiempo, su resultado es desconocido: el intento puede haber quedado contado y aun así
   el check responde 503. Una ráfaga sobre un contador solo agota ese pool; el resto del
   API sigue respondiendo. Los dos pools registran los errores de conexiones inactivas en
   vez de tumbar el proceso.
3. El BFF decide qué ruta limitar y con qué política, como antes. Envía al API la IP de
   `CF-Connecting-IP` y devuelve el 429 con `Retry-After`. Falla cerrado: sin IP, sin
   secreto interno o sin respuesta del API en 4 s, la ruta responde 503. El plazo es
   mayor que el del API (2,5 s más el `ROLLBACK`), para que el API abandone primero. Con
   `ENVIRONMENT=development` no llama al API.
4. `apps/web` deja de declarar el binding `HYPERDRIVE` y deja de depender de `pg`.

## Consecuencias

- `vp dev` de web ya no necesita `apps/web/.env`, y Postgres ya no necesita acceso desde
  Cloudflare. Solo `apps/api` y `apps/auth` hablan con Postgres.
- Cada ruta limitada suma una llamada HTTP del edge al API antes de su llamada de producto.
  Antes era una conexión del Worker a Hyperdrive. No se midió la diferencia.
- El API no limita sus propias rutas: solo el BFF las alcanza, con el secreto interno. Un
  cliente nuevo que llame al API directo tendría que pasar por esta misma comprobación.
- Al desplegar, `RATE_LIMIT_FINGERPRINT_SECRET` se configura en el API (Railway) y se
  retira del Worker. Si se reutiliza el valor anterior, las ventanas abiertas siguen
  contando; si no, se reinician una vez.

## Alternativas descartadas

- **Mantener Hyperdrive con una conexión local fija en `wrangler.jsonc`.** Quita la
  variable, pero web sigue dependiendo de Postgres solo por esta tabla.
- **Limitar dentro de cada ruta del API.** Una ruta del BFF puede hacer varias llamadas
  al API, y contaría varias veces el mismo intento.
- **Durable Objects o el binding `ratelimits` de Cloudflare.** Otro estado fuera de
  Postgres; el binding solo admite ventanas de 10 o 60 segundos y las invitaciones usan 900.

## Verificación

- Tests de la ruta del API (secreto, 503 sin configurar, política desconocida, límite por
  actor y por IP), de las políticas y de la huella. Los tests de Postgres del limitador
  se movieron con él y siguen requiriendo `TEST_DATABASE_URL`.
- Test con Postgres que retiene el lock de un contador: una ráfaga de checks falla y una
  consulta del pool de producto termina antes que cualquiera de ellos.
- Tests del BFF: 429, falla cerrada sin IP, sin secreto y con error del API, y la llamada
  HTTP al API con el secreto y la IP.

No comprobado: el limitador contra Railway en producción y la latencia añadida.
