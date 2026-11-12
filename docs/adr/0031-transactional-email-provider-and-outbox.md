# ADR-0031: Email transaccional con Resend detrás de un outbox en notifications

- Estado: Propuesta
- Fecha: 2026-11-10
- Relacionado: [ADR-0008](/docs/adr/0008-mvp-notification-channels.md) · [ADR-0011](/docs/adr/0011-tagged-errors.md) · [ADR-0015](/docs/adr/0015-better-auth-standalone-worker.md) · [ADR-0021](/docs/adr/0021-auth-and-actors-in-product-postgres.md) · [ADR-0025](/docs/adr/0025-billing-plans-and-entitlements.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

[ADR-0008](/docs/adr/0008-mvp-notification-channels.md) fija web y email como canales MVP,
con entrega al menos una vez, reintentos e idempotencia por `(event_id, channel, recipient)`,
y prohíbe que results y scheduling envíen email. Hasta ahora solo existía el feed web
(`activity_entries`). La tarea MAIL-01 pide elegir proveedor e implementar el canal para los
hechos de FTR-NTF-001: inscripción, próximo partido, reprogramación, candidatos EA, selección
propuesta, resultado o disputa, decisión del organizador y sanciones.

Restricciones verificables:

- Dos runtimes envían: `apps/api` (Node en Railway, avisos de producto) y `apps/auth`
  (Worker, verificación y restablecimiento). Un binding exclusivo de Workers no sirve a la API.
- Dominio `futrob.app` con SPF, DKIM y DMARC.
- Rebotes y quejas por webhook, y supresión de destinatarios.
- Plan Free solo web; Pro y Liga web + email
  ([ADR-0025](/docs/adr/0025-billing-plans-and-entitlements.md), `notificationChannels`).
- Plantillas ES/EN y prueba local sin enviar correo real.

## Evaluación

Datos de la documentación pública de cada proveedor en noviembre de 2026. Los precios son
orientativos y deben confirmarse al contratar; no se hicieron pruebas de entregabilidad.

| Criterio                   | Resend                                    | Cloudflare Email Service                          | Postmark                              | Amazon SES                                 |
| -------------------------- | ----------------------------------------- | ------------------------------------------------- | ------------------------------------- | ------------------------------------------ |
| Node (API) y Worker (auth) | API HTTP con `fetch`; sirve a ambos       | Binding `send_email` en Workers; desde Node, REST | API HTTP; sirve a ambos               | API firmada SigV4; en Workers exige firmar |
| SPF / DKIM / DMARC         | Registros DNS por dominio verificado      | Nativo si el DNS ya está en Cloudflare            | Registros DNS; DMARC asistido         | Easy DKIM; MAIL FROM propio para SPF       |
| Rebotes, quejas, supresión | Webhooks firmados; lista de supresión     | Menos maduro; eventos limitados                   | Webhooks y supresión por stream       | SNS/EventBridge; supresión de cuenta       |
| Precio a volumen MVP       | Gratis ~3.000/mes (100/día); plan de pago | Incluido en Workers de pago; en evolución         | Sin plan gratis de producción         | ~0,10 USD/1.000; sandbox hasta aprobación  |
| Idempotencia del envío     | Cabecera `Idempotency-Key` (24 h)         | No documentada                                    | No nativa                             | No nativa                                  |
| Prueba local               | Direcciones `@resend.dev` de prueba       | `wrangler dev` simula el binding                  | Token de prueba (`POSTMARK_API_TEST`) | Simulador de buzón (`success@simulator…`)  |

## Decisión propuesta

1. **Proveedor: Resend**, por HTTP con `fetch` desde ambos runtimes. Es el único candidato
   con clave de idempotencia nativa, lo que cubre el caso de un envío aceptado cuyo resultado
   no llegó a guardarse. Cloudflare Email Service se reevalúa cuando ofrezca idempotencia y
   eventos de rebote; Postmark queda como alternativa si la entregabilidad lo exige.
2. **Puerto neutral.** `EmailSenderPort` vive en `@futrob/notifications`; el adapter
   `ResendEmailSender` y un `InMemoryEmailSender` viven en `apps/api/src/adapters/notifications/`.
   El dominio nunca importa un SDK de proveedor.
3. **Outbox `email_outbox`** ([migración 0066](/apps/api/migrations/0066_email_outbox_and_preferences.sql)),
   único por `(event_id, channel, recipient_actor_id)`. La composición de actividad lo escribe
   en la misma transacción que la fila del feed o el resultado oficial: el comando nunca envía.
   Reprocesar el mismo hecho conserva la fila existente, así que no hay segundo email.
4. **Despacho separado.** `DispatchEmailsUseCase` reclama filas vencidas con
   `FOR UPDATE SKIP LOCKED` y un lease, envía con `Idempotency-Key = email-delivery/<id>` y
   cierra cada intento como `sent`, `skipped`, `failed` o reintento con backoff
   (1, 5, 15, 60, 240 y 720 minutos; luego `failed`). El Cron por minuto del Worker web llama a
   `POST /api/v1/internal/notifications/email-dispatch/run`. Una caída del proveedor solo
   retrasa el email; la oficialización y la reprogramación ya se confirmaron.
   Antes del primer envío el outbox fija la petición renderizada (columna `message`,
   [migración 0067](/apps/api/migrations/0067_email_outbox_pinned_message.sql)) y cada
   reintento la reenvía tal cual: si cambian el idioma, el nombre o la dirección, Resend sigue
   viendo el mismo cuerpo bajo la misma clave y devuelve el id del primer envío. Un `409
concurrent_idempotent_requests` se reintenta; un `409 invalid_idempotent_request` cierra
   la entrega como `failed`.
5. **Plan.** El despacho omite (`plan_without_email`) las organizaciones cuyo plan no incluye
   `email` en `notificationChannels`.
6. **Preferencias mínimas.** `notification_email_preferences` guarda idioma (`es`/`en`), el
   interruptor de email no crítico y un token de baja opaco. El email no crítico
   (inscripción, próximo partido, candidatos EA) lleva enlace de baja y `List-Unsubscribe`
   de un clic (RFC 8058). El crítico (piden actuar o comunican una decisión) no se puede
   desactivar y no lleva enlace de baja.
7. **Sin proveedor configurado** la API de desarrollo guarda los emails en memoria y la de
   producción los deja `pending` y responde 503 al runner, que el Cron trata como «nada que
   enviar».

## Consecuencias

- Resultados y scheduling no conocen el canal: solo la composición de notificaciones encola.
- El outbox es tabla de producto en el Postgres de la API; tenencia por `organization_id`.
- El contenido del email usa nombres guardados al ocurrir el hecho, nunca texto libre de
  usuarios; los errores guardados no contienen destinatario ni cuerpo. La petición fijada sí
  guarda dirección y cuerpo del email ya enviado, en la misma tabla de producto.
- `apps/auth` reutiliza Resend por HTTP (`ResendAuthMail`, AUTH-01) para los enlaces de
  cuenta. Esos enlaces son secretos de vida corta: se envían al momento, después de responder
  (`waitUntil`), y no pasan por `email_outbox`, que guarda el cuerpo enviado.

## Alternativas consideradas

- **Cloudflare Email Service:** natural en Workers, pero la API necesita otro camino y no hay
  idempotencia documentada.
- **Postmark:** buena entregabilidad y streams separados; sin idempotencia ni plan gratuito.
- **Amazon SES:** el más barato a escala; firma SigV4 en Workers, salida del sandbox y
  rebotes vía SNS añaden operación que el MVP no necesita.
- **Enviar dentro del comando:** descartado por ADR-0008; acopla la disponibilidad del
  proveedor a la operación competitiva.

## Cuestiones pendientes

Configuración humana antes de enviar en producción:

1. Crear la cuenta de Resend, verificar `futrob.app` y publicar sus registros SPF y DKIM, más
   una política DMARC (`p=none` al inicio, luego `quarantine`).
2. Definir en Railway `RESEND_API_KEY`, `EMAIL_FROM` (p. ej. `Futrob <avisos@futrob.app>`) y
   `WEB_BASE_URL`. Nunca en el repositorio.
3. Webhook de rebotes y quejas de Resend hacia la API, y supresión local: no implementado.
4. Disparadores de «próximo partido», «candidatos EA» y «sanción»: las plantillas existen,
   pero esos hechos aún no producen una fila de actividad ni un intent.
5. En el Worker de auth: `AUTH_EMAIL_DELIVERY=resend`, `EMAIL_FROM` y el secreto
   `RESEND_API_KEY` (cableado en AUTH-01; sin configurar en producción).

## Estado de implementación y evidencia

- Dominio y casos de uso: [`@futrob/notifications`](/packages/notifications/src/index.ts)
  (`EnqueueEmailsUseCase`, `DispatchEmailsUseCase`, preferencias, plantillas ES/EN) con
  pruebas en `email.use-cases.test.ts`.
- Adapters y composición: `apps/api/src/adapters/notifications/` y
  `apps/api/src/di/notifications.module.ts`. Contrato memoria/Postgres del outbox y las
  preferencias en `email-outbox.repository.contract.test.ts`.
- HTTP: `GET`/`PUT /api/v1/notifications/email-preferences`,
  `POST /api/v1/public/email/unsubscribe` y el runner interno, probados en
  `apps/api/src/http/routes/email.test.ts` (deduplicación, reintento tras caída, plan Free,
  baja y reactivación).
- Web: página `/email/unsubscribe` y ajuste «Avisos por email» en Configuración.
- No se probó un envío real con Resend: no había credenciales.
