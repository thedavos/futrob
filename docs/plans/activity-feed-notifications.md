# Proyección de actividad en `@futrob/notifications`

Sustituir dos superficies que hoy son ficticias. **Pendientes** de la sidebar es un placeholder
(`QueuePlaceholder` en `apps/web/src/shared/presentation/shell/shell-sidebar-nav.tsx`). La
**Actividad reciente** del inicio de organización se fabrica con `updatedAt` y `createdAt`
(`recentOrganizationActivity` en
`apps/web/src/modules/organizations/presentation/organization-home-model.ts`).

Cuando este plan esté construido:

- El organizador verá en Pendientes las disputas abiertas de su organización.
- El organizador verá en el inicio de organización las últimas 10 actividades de **todo tipo**, abiertas
  o cerradas, accionables o de vigilancia. Un CTA lleva a una pantalla con toda la actividad paginada.
- El capitán o vicecapitán verá en Pendientes las propuestas de selección que su equipo debe confirmar.
- El jugador verá en Pendientes las invitaciones dirigidas a él.

El mantenedor hereda una proyección en `@futrob/notifications`. La fila resume el hecho. La auditoría
de resultados, fixtures, invitaciones y reprogramaciones sigue en sus tablas.

## Lo que se decidió y por qué

- **Una tabla, `activity_entries`.** Cada fila es un hecho para una audiencia. Tres tablas por
  audiencia repetirían el esquema.
- **Escritura en la transacción del comando, compuesta en `apps/api/src/di/`.** Mismo patrón que la
  proyección de estadísticas en `createOfficialSelectionCommands` (ADR-0016). Si el comando revierte,
  la fila no queda. Si el insert falla, el comando revierte. `PostgresTransactionPort` reutiliza una
  transacción exterior, así que envolver un caso de uso que ya abre la suya es seguro.
- **Sin outbox todavía.** `NoopEventPublisher` descarta los eventos y el feed quedaría vacío. ADR-0008
  pide persistir el intent del canal antes de declarar entrega fiable; esta tabla es el intent del
  canal web. Email y outbox quedan fuera.
- **Sin lectura cruzada.** Unir `official_selection_actions`, invitaciones y competiciones no da
  historial de publicación y obliga a la sidebar a consultar varios contextos por render.
- **`close` sobre una fila inexistente no falla.** Devuelve `ok` con 0 filas. La operación competitiva
  no depende del canal (ADR-0008).
- **Audiencia `team`, no actor, para confirmar una selección.** `OfficialSelectionCommandOutput` no
  nombra a ningún actor: confirma el equipo rival de `proposal.proposingTeamId`, representado por su
  capitán o vicecapitán. La API resuelve en lectura los equipos del actor; `notifications` no busca
  capitanes.
- **Sin audiencia `competition`.** Nadie la leería. Se sustituye por la columna `competition_id`.

## Forma de la fila

| Campo                          | Regla                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                           | Identidad de la fila                                                                                                                                             |
| `organization_id`              | Siempre presente. Todo filtro de lectura incluye organización, o actor/equipo                                                                                    |
| `competition_id`               | Nulo si el hecho no pertenece a una competición                                                                                                                  |
| `audience`                     | `organization`, `team` o `actor`                                                                                                                                 |
| `audience_id`                  | Id de esa audiencia. Con `organization` repite `organization_id`                                                                                                 |
| `kind`                         | `match_dispute`, `selection_confirmation`, `roster_invitation` o `competition_published`                                                                         |
| `status`                       | `open` o `closed`. `closed_at` es nulo exactamente cuando está abierta (CHECK)                                                                                   |
| `requires_action`              | La audiencia debe actuar. Pendientes muestra estas filas abiertas                                                                                                |
| `resource_type`, `resource_id` | Destino del clic: encuentro, invitación o competición                                                                                                            |
| `subject`                      | JSONB instantáneo para pintar la fila (`competitionName`, `encounterLabel`, `teamName` según `kind`). Nunca razones libres: las razones de auditoría se redactan |
| `actor_id`                     | Quién provocó el hecho. FK a `actors`                                                                                                                            |
| `closed_by_actor_id`           | Quién lo cerró. Nulo si lo cerró el sistema o nació cerrado. FK a `actors`                                                                                       |
| `opened_at`, `closed_at`       | Un hecho nacido cerrado usa la misma marca en ambas                                                                                                              |
| `expires_at`                   | Opcional. Una fila abierta y vencida no entra en Pendientes                                                                                                      |
| `last_event_at`                | `closed_at ?? opened_at`. Lo mantienen `record` y `close`. Ordena el feed                                                                                        |
| `source_name`, `source_id`     | `match_dispute:<id>`, `proposal:<id>`, `roster_invitation:<id>`, `competition:<id>`                                                                              |

- Clave única `(source_name, source_id, audience, audience_id)`. Reintentar no duplica. Cerrar dos
  veces conserva el primer `closed_at`.
- Índice del feed: `(audience, audience_id, last_event_at DESC, id DESC)`. Sirve la paginación por
  cursor.
- Índice de Pendientes: parcial `(audience, audience_id, opened_at DESC) WHERE status = 'open' AND
requires_action`.

Estados legales: abierta y accionable, abierta en vigilancia, cerrada, nacida cerrada. Una fila
abierta con `expires_at` vencido queda fuera de Pendientes en la lectura, sin job.

### Reparto

| Hecho                                     | Filas                                                                    | Quién actúa                     | Cierra                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------- |
| Disputa abierta (`open` o `under_review`) | Organización, accionable                                                 | Operador                        | Resolución `approved_proposal` o `returned_to_selection`      |
| Propuesta pendiente de confirmar          | Equipo rival, accionable. Organización en vigilancia                     | Capitán o vicecapitán del rival | Confirmar, rechazar, alternativa, disputa abierta, expiración |
| Alternativa propuesta                     | Cierra la anterior y abre otra para el otro equipo                       | El otro equipo                  | Igual que la anterior                                         |
| Invitación con `invitee_actor_id`         | Actor invitado, accionable, con `expires_at`. Organización en vigilancia | El invitado                     | Aceptar por token o por id, declinar                          |
| Invitación solo por token                 | Ninguna en este corte                                                    | —                               | —                                                             |
| Competición publicada                     | Organización, nacida cerrada                                             | Nadie                           | —                                                             |

Todas las filas de organización, de cualquier `kind` y estado, alimentan la actividad del
organizador. Así el inicio y la pantalla completa muestran actividad de todo tipo.

## Lectura

| Consumidor                          | Consulta                                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Pendientes, espacio de organización | `audience = organization`, `status = open`, `requiresAction = true`, no vencidas                                                 |
| Pendientes, espacio de jugador      | `/me`: `audience = actor` con el actor, más `audience = team` con los equipos que representa; abiertas, accionables, no vencidas |
| Inicio de organización              | `audience = organization`, sin filtro de estado ni de acción, `limit = 10`                                                       |
| Pantalla «Toda la actividad»        | La misma consulta, paginada por cursor `(last_event_at, id)`, 25 por página                                                      |

Contrato HTTP:

- `GET /api/v1/organizations/:organizationId/activities?status=&requiresAction=&limit=&cursor=`
  devuelve `{ activities, nextCursor }`. `limit` por defecto 25, máximo 50. Exige el permiso de
  operador fijado en T0.
- `GET /api/v1/me/activities?status=&requiresAction=&limit=&cursor=` devuelve lo mismo para el actor
  y sus equipos.

## Pantallas

### Inicio de organización

- La sección «Actividad reciente» muestra hasta **10** filas de organización de todo tipo, ordenadas por
  `last_event_at` descendente.
- Cada fila muestra título por `kind` (i18n) con `subject`, estado (abierta, cerrada, requiere acción)
  y tiempo relativo. El clic lleva a `resource_type`/`resource_id`.
- La cabecera de la sección tiene el CTA **«Ver toda la actividad»** hacia
  `/orgs/$orgId/activity`. Se muestra siempre que haya al menos una fila.
- Sin filas, la sección muestra su vacío actual (`org.home.activity.empty`) y no muestra el CTA.
- Se elimina `recentOrganizationActivity` y sus tests.

### Toda la actividad (`/orgs/$orgId/activity`)

- Ruta nueva `apps/web/src/routes/_app/orgs/$orgId/activity.tsx`, con el mismo permiso que el
  endpoint.
- Lista completa de filas de organización, misma fila visual que el inicio, 25 por página con
  «Cargar más» mientras haya `nextCursor`.
- Estados: cargando, vacío, error con reintento y permiso denegado.
- Filtros por `kind` o estado quedan fuera de este corte.

### Pendientes en la sidebar

- Sustituye `QueuePlaceholder` por filas `QueueTaskItem` del espacio activo.
- Vacío «Nada por ahora». Cargando y error ya tienen historias en `queue-task-item.stories.tsx`.

## Tareas

Cada tarea es un PR verificable por sí solo.

```text
T0 ──────────────┐
T1 ─> T2 ─> T3 ─┬┴> T5 ─┬─> T6a (inicio org, 10 + CTA)
                │       ├─> T6b (toda la actividad)
                │       └─> T6c (sidebar)
                ├─> T4 (publicación)
                ├─> T7 (confirmaciones; también T5)
                └─> T8 (invitaciones)
T9 cierra todo
```

- **Hilo 1:** T1 → T2 → T3 → T4 → T7. T7 toca el mismo `official-selection.commands.ts` que T3.
- **Hilo 2:** T0 desde el inicio; T5 cuando T1 esté mergeada; luego T6a, T6b, T6c y T8.
- **Ruta crítica:** T1 → T2 → T3 → T5 → T6a.

### T0. Permiso de lectura y ADR-0008

- [ ] Confirmar en la matriz RBAC si el organizador obtiene `encounters.results.approve` en el scope
      de organización. Si no, elegir `competitions.update`. No se crea un permiso nuevo.
- [ ] Añadir un caso a la matriz RBAC que fije el permiso: organizador permitido, `member` con solo
      `organizations.read` denegado.
- [ ] Actualizar «Estado de implementación» de ADR-0008: canal web como proyección transaccional;
      email y outbox pendientes.

Hecho cuando el caso RBAC pasa y el ADR está actualizado.

### T1. Modelo y casos de uso

Depende de: nada.

- [ ] Tipos de fila, los 4 `kind`, las 3 audiencias y la forma de `subject` por `kind` en
      `packages/notifications/src/domain/`.
- [ ] `recordActivity`: inserta o devuelve la fila existente.
- [ ] `closeActivity`: cierra por origen, o por origen y audiencia; conserva el primer cierre;
      devuelve cuántas filas cerró.
- [ ] `listActivities`: audiencia con lista de ids, `organizationId` opcional, `status`,
      `requiresAction`, `now`, `limit`, `cursor`. Devuelve `nextCursor`.
- [ ] Errores `TaggedError` con códigos `notifications.*`. `ClockPort` inyectable.
- [ ] Repositorio en memoria y suite de contrato parametrizada por repositorio.
- [ ] `index.ts` exporta solo la API pública.

Pruebas (memoria):

- [ ] Abrir `dsp-1` de `org-a`/`cmp-a` a las 10:00. El listado abierto y accionable de la
      organización devuelve una fila `match_dispute` con `competitionId cmp-a`. Un segundo `record`
      devuelve el mismo id y el listado sigue con una fila.
- [ ] Cerrar a las 11:00: listado abierto vacío; reciente con `closed`, `closedAt` y `lastEventAt`
      11:00. Cerrar a las 12:00 deja 11:00.
- [ ] `competition_published` a las 09:00 nacida cerrada: `closedAt = openedAt`; ordenada detrás de
      la disputa cerrada a las 11:00.
- [ ] La misma disputa en `org-b` no aparece en `org-a`.
- [ ] Cerrar un origen desconocido devuelve `ok` con 0 y el listado no cambia.
- [ ] Invitación a `act-1` que vence a las 12:00: aparece a las 11:00, no a las 12:01; `act-2` vacío.
- [ ] Propuesta `p-1` para `tm-away`: aparece con `team ∈ [tm-away]`, no con `[tm-home]`.
- [ ] Con 12 filas, `limit 10` devuelve 10 y `nextCursor`; la segunda página devuelve 2 y
      `nextCursor` nulo, sin repetir ni saltar filas con el mismo `last_event_at`.

### T2. Migración y adapter Postgres

Depende de: T1.

- [ ] `apps/api/migrations/0053_activity_entries.sql`: tabla, CHECK de `closed_at`, FK a
      `organizations` y `actors`, clave única, índices de feed y de Pendientes.
- [ ] Backfill de `match_disputes` con `status <> 'resolved'` y de `roster_invitations` `pending`
      con `invitee_actor_id` no nulo.
- [ ] Adapter en `apps/api/src/adapters/notifications/` con `getPgExecutor` para participar en la
      transacción en curso.

Hecho cuando la suite de T1 pasa contra Postgres, una disputa abierta antes de migrar aparece en el
listado y `npm run migrate -w @futrob/api` es idempotente.

### T3. Composición y disputas

Depende de: T1, T2.

- [ ] Módulo de notifications en `apps/api/src/di/create-modules.ts`, en memoria o Postgres según
      `DATABASE_URL`.
- [ ] En `composed()` de `createOfficialSelectionCommands`, tras `outcome.isOk()` y dentro del lock:
      `openDispute` registra, `resolveDispute` cierra, `reviewDispute` no cambia nada. No se omite en
      replay: ambos son idempotentes.
- [ ] `subject` con los datos que la composición ya tiene o con una lectura por id.

Pruebas:

- [ ] Composición en memoria: abrir y listar da una fila abierta; repetir no suma; resolver la cierra
      y Pendientes queda vacío.
- [ ] Ampliar «rolls selection, audit and result back when the projection fails» en
      `official-selection.composition.integration.test.ts`: tras el fallo no hay fila nueva; el
      reintento limpio deja exactamente las filas esperadas.

### T4. Competición publicada

Depende de: T3.

- [ ] Envolver `competitions.publish` en `transaction.runInTransaction` en la composición.
- [ ] Registrar la fila de organización nacida cerrada con `subject.competitionName`.

Hecho cuando publicar y listar devuelve una fila cerrada con `closedAt = openedAt` y republicar no
duplica.

### T5. HTTP, contratos y SDK

Depende de: T0, T1. Se desarrolla contra memoria; se mergea después de T3.

- [ ] Schemas en `@futrob/api-contracts`: fila, `nextCursor`, query params.
- [ ] `GET /organizations/:organizationId/activities` con el permiso de T0.
- [ ] `GET /me/activities` que resuelve los equipos del actor (capitán o vicecapitán) con
      `list-rosters-for-player`.
- [ ] Métodos en `@futrob/sdk` con paginación.

Pruebas:

- [ ] El organizador de `org-a` recibe la disputa con `kind`, `status`, `resourceId` y `subject`.
- [ ] Un `member` con solo `organizations.read` recibe 403; un actor ajeno recibe el rechazo que ya
      usa `/organizations/:id/competitions`.
- [ ] `limit=10` sobre 12 filas devuelve 10 y `nextCursor`; con el cursor devuelve 2.
- [ ] `act-1` recibe su invitación y `act-2` una lista vacía; el capitán de `tm-away` recibe la
      propuesta y el de `tm-home` no.

### T6a. Inicio de organización: últimas 10 y CTA

Depende de: T5 (T4 para tener datos reales).

- [ ] Consultar `listActivities` de organización con `limit 10`, sin filtro de estado ni de acción.
- [ ] Fila con título por `kind`, `subject`, estado y tiempo relativo; clic al recurso.
- [ ] CTA «Ver toda la actividad» hacia `/orgs/$orgId/activity`, visible con al menos una fila.
- [ ] Copy ES/EN en `catalogs.ts`.
- [ ] Eliminar `recentOrganizationActivity` y sus tests.
- [ ] Historias: lleno con los 4 `kind`, exactamente 10, vacío sin CTA, cargando, error.

Pruebas:

- [ ] Con una disputa abierta, una confirmación en vigilancia, una invitación en vigilancia y una
      publicación más reciente, la sección muestra las cuatro y la publicación primero.
- [ ] Con 12 filas muestra 10 y el CTA.
- [ ] Sin filas muestra el vacío y no el CTA.

### T6b. Pantalla «Toda la actividad»

Depende de: T5. Puede ir en paralelo con T6a si la fila visual se extrae primero en T6a.

- [ ] Ruta `apps/web/src/routes/_app/orgs/$orgId/activity.tsx` con el permiso de T0.
- [ ] Lista paginada de 25 con «Cargar más» mientras haya `nextCursor`.
- [ ] Estados: cargando, vacío, error con reintento, permiso denegado.
- [ ] Historias de Storybook de cada estado.

Pruebas:

- [ ] Con 30 filas muestra 25; «Cargar más» añade 5 y desaparece.
- [ ] Un `member` ve el estado de permiso denegado.

### T6c. Pendientes en la sidebar

Depende de: T5.

- [ ] Sustituir `QueuePlaceholder` por filas `QueueTaskItem` según el espacio activo:
      organización o `/me`.
- [ ] Estados lleno, vacío («Nada por ahora»), cargando y error.

Pruebas:

- [ ] Con una disputa abierta y una publicación más reciente, Pendientes muestra la disputa y no la
      publicación.
- [ ] Al resolver la disputa, Pendientes muestra «Nada por ahora» y el inicio conserva la disputa
      cerrada.

### T7. Confirmaciones de selección

Depende de: T3, T5.

- [ ] `propose` registra la fila del equipo rival y la de organización en vigilancia, con origen
      `proposal:<id>` y `expires_at` = plazo de confirmación.
- [ ] `confirm`, `reject` y `openDispute` cierran por `proposal:<id>`.
- [ ] `proposeAlternative` cierra la anterior y registra la nueva para el otro equipo.
- [ ] `expire` cierra, incluida su rama fuera de `composed()` que usa el proceso de expiración.

Pruebas:

- [ ] propose → proposeAlternative → confirm deja una fila cerrada por propuesta y ninguna abierta.
- [ ] `expire` cierra la fila de la propuesta.
- [ ] El capitán rival la ve en `/me` y el proponente no.

### T8. Invitaciones dirigidas

Depende de: T3.

- [ ] Envolver `createRosterInvitation` en una transacción en la composición y verificar que el
      repositorio usa `getPgExecutor`.
- [ ] Registrar solo si `inviteeActorId` no es nulo.
- [ ] Cerrar en `acceptRosterInvitation` y en `respondToRosterInvitation` (aceptar y declinar).

Pruebas:

- [ ] Crear y declinar deja la fila cerrada.
- [ ] Aceptar por token cierra la fila del invitado y la de organización.
- [ ] Una invitación solo por token no crea fila.

### T9. Verificación end-to-end

Depende de: todas.

- [ ] Con `verify-futrob` y `apps/cli`: abrir y resolver una disputa, publicar una competición,
      proponer y confirmar una selección, invitar a un jugador.
- [ ] Ver el inicio (máximo 10 y CTA), la pantalla completa y la sidebar con datos reales en ambos
      espacios.
- [ ] Adjuntar capturas o salida del CLI al último PR.

## Fuera de alcance

- Email, outbox y entrega fiable por canal externo.
- Invitaciones solo por token: no tienen audiencia que actúe y la política `multi` no tiene un cierre
  único. Requieren primero un caso de uso de revocar.
- Filtros por `kind` o estado en «Toda la actividad».
- Lectura de `notifications` en la app móvil.

## Riesgos

- **Permiso de organización.** Si el organizador no obtiene `encounters.results.approve` en el scope
  de organización, T0 elige `competitions.update`.
- **Ruido de vigilancia.** Cada propuesta añade una fila al feed del organizador. Si molesta, se
  filtra por `kind` en la vista sin tocar el modelo.
- **Cambio de capitán.** Desaparece con la audiencia `team`, resuelta en lectura.
