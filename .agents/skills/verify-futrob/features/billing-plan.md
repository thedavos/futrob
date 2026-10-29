# Plan y uso, upsell y precios

Plan de la organización (Gratis, Pro, Liga) con sus límites y cupo de sync, los estados de upsell cuando el plan no incluye una acción (HTTP 402) y la página pública de precios. ADR-0025.

## Sub-features

- Página «Plan y uso»: uso contra límites, cupo de sync del mes, features incluidas, cambios de plan.
- Upsell 402: segunda competición activa en Gratis, staff por encima del cupo, ranking de rendimiento fuera del plan.
- `/pricing` pública, enlazada desde la cabecera de la landing («Precios»).
- Asignación manual por superusuario (solo API/CLI; no hay UI de compra).

## How to get to it (user POV)

- Sidebar de organización → «Plan y uso» (requiere organizer o staff).
- Crear una segunda competición en una organización Gratis → alerta con «Ver plan y uso».
- Competición → «Ranking de rendimiento» en Gratis → vacío «El ranking de rendimiento es de Pro y Liga».
- Landing → «Precios».

## Driving it with verify-futrob

1. Registrarse como organizador y crear la organización (onboarding organizador).
2. Abrir «Plan y uso»: snapshot con `Gratis`, `Plan por defecto` y la fila de sincronizaciones.
3. Intentar «Crear competición» por segunda vez: snapshot de la alerta warning y su enlace.
4. Asignar Pro con `npm run cli -- org-plan-assign <orgId> pro --reason "verify" --actor <superuser>`.
5. Recargar «Plan y uso»: leer `Pro`, `Activo` y la fila en «Cambios de plan».
6. Para el cupo agotado, `npm run cli -- billing-smoke` sobre otra organización y abrir su página.

## Gotchas

- El superusuario debe existir como actor (`INITIAL_SUPERUSER_ACTOR_ID`) en el mismo Postgres.
- Los jobs de sync encolados por la ruta interna no se ejecutan solos; el smoke no llama a EA.
- No hay ningún flujo web que encole syncs; el cupo agotado solo se ve en «Plan y uso».
