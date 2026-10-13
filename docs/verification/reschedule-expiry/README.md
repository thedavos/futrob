# Expiración, escalada y resolución — evidencia de entrega

Verificado el 2026-10-13 sobre Node 24.21.0. La capa usa el Encounter de
[#154](https://github.com/thedavos/futrob/pull/154) e integra la política de aviso de
[#156](https://github.com/thedavos/futrob/pull/156). Durante la verificación se integró #156 en main; #154 sigue abierto.
No se hizo merge ni despliegue desde este hilo. El PR espera #154.

## Comprobaciones

El primer CI de #159 falló porque `test:coverage` no recibía `TEST_DATABASE_URL`;
las seis pruebas de coherencia intentaban abrir Postgres sin configuración.
La corrección configura la conexión para todo el job Test, de modo que la cobertura
incluye las suites durables. La suite de coherencia contempla ejecución local sin
base, como las demás suites Postgres; CI dispone de la base y ejecuta sus seis pruebas.

La reproducción de `npm run test:coverage` con Postgres aislado terminó con exit 0:
3.949 pruebas pasan, líneas 85,31 %, ramas 76,2 %, statements 83,24 % y funciones
83,44 %. Las seis pruebas de coherencia pasan sin skips; sin base configurada se
reportan explícitamente como omitidas.

| Comando                                                                      | Resultado                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| `./node_modules/.bin/vp install`                                             | Exit 0                                                  |
| `TEST_DATABASE_URL=<Postgres aislado> npm run test -- --run`                 | 480 archivos, 3.949 pruebas pasan; un skip existente    |
| Suites API de Scheduling, respuestas HTTP y handoff, con `TEST_DATABASE_URL` | 18 archivos, 142 pruebas pasan, **cero skips**          |
| Paquetes Scheduling, Competitions, SDK y contratos                           | 56 archivos, 342 pruebas pasan                          |
| Suite web explícita                                                          | 126 archivos, 698 pasan; cinco skips existentes         |
| Historias de configuración y resolución, Chromium                            | 20/20 pasan, incluidos plays y a11y                     |
| `npm run check`, `npm run typecheck`                                         | Exit 0                                                  |
| `npm run generate:openapi`, `npm run generate:routes`                        | Exit 0; OpenAPI formateado con el check del repositorio |
| `npm run build`, `npm run storybook:build`, `npm run bundle:budget`          | Exit 0                                                  |

El presupuesto final mantiene el entry en aproximadamente 78 KiB gzip (límite
250 KiB); el mayor chunk compartido sigue en 113 KiB (límite 120 KiB).
La última ejecución de historias terminó sus 20 pruebas correctamente y notificó
un timeout de cierre del proceso de Vitest; la ejecución anterior cerró con exit 0.

## Vectores y garantías durables

`apps/api/src/adapters/scheduling/schedule-change-expiry.postgres.integration.test.ts`
ejecuta V32-01…13 y V32-15…36. V32-14 está en
`packages/competitions/src/application/competition-setup.use-cases.test.ts` y se
complementa con la configuración publicada deshabilitada en la prueba viva.

Las pruebas usan migraciones reales en schemas exclusivos del contenedor
`futrob-reschedule-c6995a0c-postgres`, con Postgres en `127.0.0.1:55432`. No migran
una base compartida. La migración nueva es `0055_schedule_change_expiry_resolution.sql`.

- Matriz de etapas de 6 y 12 horas: milisegundo anterior, deadline exacto y posterior;
  rechazar/aceptar/contraproponer fuera de plazo fallan sin necesitar el runner.
- Contrapropuesta reemplaza deadline y consentimientos; replay conserva la versión
  histórica. Kickoff y fecha propuesta no recortan el plazo.
- Migración legacy desde antes de 0055 conserva `createdAt`, usa la etapa o default
  12 y deja estados terminales intactos.
- Carreras accept/expire usan dos conexiones y barreras deterministas sobre el lock
  real de Postgres. Otra carrera cruza el deadline mientras espera el lock.
- Los fallos de fixture, publisher y transición revierten auditoría, recibos,
  aplicación, cupo, snapshot y slots. Adapters nuevos recuperan trabajo pendiente.
- `schedule-change-read-coherence.postgres.integration.test.ts` verifica que una
  lectura concurrente no mezcla cabecera, propuestas, auditoría y aplicación de
  versiones diferentes.
- HTTP usa actores provisionados y el resolver real de grants/rosters: jugador,
  capitán, organizador y actor ajeno no reciben las mismas acciones. Los comandos
  comprueban tenant, capacidad vigente, versión y replay.
- V6 conserva las dos guardas de aviso; sus escenarios de aviso aíslan un TTL
  suficiente. V32 aísla el aviso salvo la prueba explícita del bypass post-escalada.

## Prueba viva: auth → BFF → API → Postgres

Web `:3300`, auth `:28888`, API `:18787`; nombres de Workers, secretos y estados
locales exclusivos del hilo. Se registró una cuenta real por la UI de Better Auth,
se completó onboarding de organizador y se creó «Copa V32». Una segunda cuenta real
provisionó el actor configurado de recuperación; no se inventaron ActorIds.

La API usa los adapters y casos de uso de producción con `ClockPort` de Scheduling
inyectado desde un archivo local. Avanzar ese reloj permite observar seis horas de
plazo sin esperar seis horas reales. Auth, BFF, HTTP, autorización, Postgres y UI
no están mockeados. Los participantes se añadieron por el BFF; el fixture se generó
con el SDK contra la API. No se probaron candidatos EA vivos.

1. En el wizard se guardaron dos partidos por cruce, aviso mínimo **12 h** y plazo
   de respuesta **6 h**. GET del BFF devolvió esos valores. Al publicar y reabrir
   el wizard los controles quedaron deshabilitados. [Captura](./rules.png).
2. Crear por el BFF a `2026-11-01T08:00:00.000Z` devolvió `open`, propuesta con
   deadline `2026-11-01T14:00:00.000Z`. El barrido interno a ese instante devolvió
   `{ "escalated": 1, "skipped": 0 }`; repetirlo no añadió auditoría.
3. El organizador fijó por la UI `2026-11-01 10:00 America/Lima` (15:00 UTC),
   solo una hora después del procesamiento. Tab alcanzó «Guardar resolución» con
   `:focus-visible`; Enter envió el comando. Ambos slots y la cabecera cambiaron a
   esa hora, aunque el aviso mínimo era 12. El historial muestra fecha, motivo,
   actor y desplazamiento de ambos slots. [Slots](./schedule-set.png),
   [historial](./schedule-set-history.png).
4. Otra solicitud vencida se cerró por la UI con `schedule_kept`. Una tercera se
   cerró con `walkover_intended`, eligiendo Maderas V32 y un motivo. Una cuarta,
   sobre el slot 2, demostró que no elegir ganador muestra validación y no envía
   resolución; elegirlo permite guardar. [Historial de walkover](./walkover-history.png).
5. GET nuevo del BFF y [consulta SQL](./sql-proof.txt) confirmaron cuatro cierres
   `resolved_by_organizer`, una sola aplicación/cupo, slots todavía a 15:00 UTC y
   **cero OfficialResult y cero snapshots de clasificación**.
6. A 390 × 844, overflow horizontal 0; actualizar e historial miden 44 px.
   [Captura móvil](./mobile.png). ES se ejerció en la UI viva; EN, loading, vacío,
   error, denegación, conflicto y envíos pendientes se ejercieron en tests e historias.
7. Una quinta solicitud se creó, se detuvo la API y se inició otro proceso sobre
   la misma base. El barrido interno en su deadline devolvió una escalada. GET del
   BFF confirmó versión 2 y una única acción system con el deadline original.

## Límites operativos

La configuración exige `SCHEDULING_SYSTEM_ACTOR_ID` provisionado. Si falta, el
runner responde 503. Recupera hasta 50 solicitudes por barrido; el Cron existente
lo llama cada minuto. El retraso del runner no permite respuestas tardías.

La composición de Cron está presente en el bundle y sus llamadas se cubren en
tests. La invocación local con Vite/Wrangler no demostró el barrido de la API; no
se presenta como prueba viva del Cron. Un probe del fetch del bundle con Wrangler
también falló con `Calling require for "events" ...`; no se modificó la configuración
productiva para ocultarlo. Sí se verificaron los Workers de auth/BFF en desarrollo
y la recuperación real de API después de reiniciar. Falta validar el artefacto
compilado en el entorno de Workers antes de desplegar.

Walkover es intención de Scheduling. Su oficialización, notificaciones y QA dedicada
del backlog quedan fuera de esta entrega. No se hizo merge ni despliegue.
