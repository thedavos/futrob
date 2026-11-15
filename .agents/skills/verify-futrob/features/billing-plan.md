# Plan y uso, upsell y precios

Plan de la organización (Gratis, Pro, Liga) con sus límites y cupo de sync, los estados de upsell cuando el plan no incluye una acción (HTTP 402) y la página pública de precios. ADR-0025.

## Sub-features

- Página «Plan y uso»: uso contra límites, cupo de sync del mes, features incluidas, cambios de plan.
- Upsell 402: segunda competición activa en Gratis, staff por encima del cupo, ranking de rendimiento fuera del plan.
- `/pricing` pública, enlazada desde la cabecera de la landing («Precios»).
- «Solicitar plan»: el organizador pide Pro o Liga (solicitud manual, sin pago) y puede retirarla.
- Panel de superusuario `/admin/billing`: cola de solicitudes y asignación de plan con motivo, auditada. Otros roles reciben 403. También sigue disponible por API/CLI.

## How to get to it (user POV)

- Sidebar de organización → «Plan y uso» (requiere organizer o staff).
- Crear una segunda competición en una organización Gratis → alerta con «Ver plan y uso».
- Competición → «Ranking de rendimiento» en Gratis → vacío «El ranking de rendimiento es de Pro y Liga».
- Landing → «Precios».
- Alerta de upsell → «Ver plan y uso» → «Solicitar plan» (dos pasos).
- Superusuario: menú de cuenta → «Planes y solicitudes» (`/admin/billing`).

## Driving it with verify-futrob

1. Registrarse como organizador y crear la organización (onboarding organizador).
2. Abrir «Plan y uso»: snapshot con `Gratis`, `Plan por defecto` y la fila de sincronizaciones.
3. Intentar «Crear competición» por segunda vez: snapshot de la alerta warning y su enlace.
4. Pulsar «Solicitar plan» (Pro): snapshot del estado «Solicitud pendiente». Como superusuario, abrir `/admin/billing`, ver la fila y asignar Pro con motivo; o bien asignar con `npm run cli -- org-plan-assign <orgId> pro --reason "verify" --actor <superuser>`.
5. Recargar «Plan y uso»: leer `Pro`, `Activo` y la fila en «Cambios de plan».
6. Para el cupo agotado, `npm run cli -- billing-smoke` sobre otra organización y abrir su página.

## Gotchas

- `/pricing`: cada plan es una región con su nombre (`Gratis`, `Pro`, `Liga`). Todos los CTA van a `/signup` porque no hay compra; los importes son de lista y no están en el catálogo. Sincronización automática con EA y el branding del portal con logo, colores o avanzado llevan la insignia «Próximamente» (no prometen nada hasta que exista su consumidor); Gratis no muestra ninguna.
- El superusuario debe existir como actor (`INITIAL_SUPERUSER_ACTOR_ID`) en el mismo Postgres.
- Los jobs de sync encolados por la ruta interna no se ejecutan solos; el smoke no llama a EA.
- No hay ningún flujo web que encole syncs; el cupo agotado solo se ve en «Plan y uso».
