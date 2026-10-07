# ADR-0008: Notificaciones web y email en el MVP

- Estado: Aceptada
- Fecha: 2026-07-17
- Actualizada: 2026-10-07
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Producto contempla notificaciones de inscripción, reprogramación, selección, resultados
y disputas. El bounded context vigente es `notifications`, no `communications`.

## Decisión

`notifications` recibirá intents de otros contextos mediante contratos explícitos.
Los canales MVP son in-app/web y email; los providers viven en adapters, mientras el
dominio mantiene destinatarios, intención y templates versionados.

La entrega deberá tolerar al menos una entrega y reintentos, con idempotencia por
`(event_id, channel, recipient)`. Resultados y scheduling no enviarán email directamente.
WhatsApp, Telegram y push permanecen como ampliaciones fuera del camino Must.

## Consecuencias

La operación competitiva no depende de la disponibilidad del canal de notificación.
Persistencia de intents, publicación, consumer, retry y deduplicación deben resolverse
juntos antes de declarar entrega fiable. La Queue de sync no implementa este circuito.

## Alternativas descartadas

Mensajería externa como canal Must; I/O de email dentro de casos de uso competitivos;
considerar un evento emitido como notificación entregada.

## Estado de implementación y evidencia

El canal in-app/web existe como proyección transaccional. El package
[notifications](/packages/notifications/src/index.ts) expone `recordActivity`,
`closeActivity` y `listActivities` sobre `activity_entries`
([migración 0054](/apps/api/migrations/0054_activity_entries.sql)): una fila por hecho y
audiencia (`organization`, `team`, `actor`), única por origen y audiencia. La composición en
`apps/api` la escribe dentro de la transacción del comando que produce el hecho (selección
oficial, publicación de competición, invitaciones dirigidas), igual que la proyección de
[ADR-0016](/docs/adr/0016-official-results-transactional-projection.md): si la escritura falla,
el comando revierte; cerrar un origen inexistente no falla. Esta tabla es el intent persistido
del canal web; no hay consumer ni entrega asíncrona.

Siguen pendientes el email, el outbox general, los reintentos y la deduplicación por
`(event_id, channel, recipient)`. El publisher de dominio sigue siendo no-op. Este documento
no certifica un servicio de entrega de email existente.
