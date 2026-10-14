# Invitar equipos a una competición

El paso **Participantes** de la configuración solo muestra equipos inscritos. Hoy un equipo
entra de dos maneras: el organizador lo crea a mano (`POST …/participants`), o un actor se
postula desde Explorar con las inscripciones abiertas (ADR-0019). No hay forma de traer a un
equipo concreto ni de compartir un enlace por WhatsApp para que se inscriba.

Cuando este plan esté construido:

- El organizador verá **Invitar equipo** en el paso Participantes, tanto en `draft` como en
  `registration`. Abre un diálogo con dos pestañas: **Equipo en Futrob** y **Por enlace**.
- **Equipo en Futrob:** busca a un jugador de Futrob por gamertag. Cada resultado muestra su
  club EA declarado (escudo, nombre y plataforma). Puede añadir un mensaje opcional. El
  invitado lo verá en Pendientes y en Mis invitaciones.
- **Por enlace:** la competición tiene un único enlace activo. El organizador puede copiarlo,
  compartirlo por WhatsApp o regenerarlo. Al regenerarlo, el anterior deja de funcionar.
- Quien acepta, directa o por enlace, pone nombre a su equipo. Ese equipo queda inscrito y el
  invitado pasa a ser su capitán.
- El paso Participantes lista las invitaciones enviadas y pendientes, con la opción de revocarlas.

## Qué soporta hoy el backend

| Pieza                                                                                                   | Estado  | Por qué no basta                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /organizations/:org/competitions/:comp/invitations` con rol `captain`                             | Existe  | Al aceptar solo da `CompetitionMembership` (rol capitán) y membresía `member` de la organización. No crea `Team`, `CompetitionEntry` ni plantilla. DEC-071 lo fija así: el capitán queda sin equipo.             |
| `CompetitionApplicationFlow` (`CreateApplicantTeam` → `ApplyToCompetition` → `ClaimApplicantCaptaincy`) | Existe  | Crea equipo, inscripción y capitanía, pero exige `registration` y deja la inscripción `pending`. No pasa por ninguna invitación.                                                                                 |
| Invitaciones de plantilla (`RosterInvitation`)                                                          | Existe  | Es el patrón a copiar: dirigidas por gamertag o por enlace, mensaje, bandeja `GET /players/me/roster-invitations`, aceptar o rechazar, y actividad en Pendientes. Invitan a una plantilla, no a una competición. |
| Buscar jugadores de Futrob                                                                              | Falta   | La invitación de plantilla resuelve un identificador exacto (`teams.invitee_not_found`). No hay listado ni búsqueda.                                                                                             |
| Directorio global de equipos                                                                            | Falta   | `Team` pertenece a una organización (glosario). Un «Cóndor FC» de otra organización es otro tenant.                                                                                                              |
| Compartir por WhatsApp                                                                                  | n/a     | Es solo cliente: `https://wa.me/?text=<texto codificado>`.                                                                                                                                                       |
| UI                                                                                                      | Parcial | `Dialog`, `Tabs`, `InputWithIcon`, `Textarea` y `useCopyToClipboard` existen en `@futrob/ui`. `CreateCompetitionInvitationPanel` existe, pero nadie lo monta y genera invitaciones de jugador.                   |

**Conclusión:** se puede construir con lo que ya hay, pero faltan tres piezas: una invitación que
termine en una inscripción, un flujo de aceptación que cruce contextos, y una búsqueda de jugadores.

## Decisiones

Las marcadas con **(abierta)** son de producto. Si no se dice otra cosa, se aplica la recomendación.

1. **«Equipo en Futrob» es un jugador que será capitán, no un equipo existente. (abierta)**
   Un `Team` vive dentro de una organización. Para invitar a un equipo existente haría falta una
   identidad de club entre tenants, que hoy no existe y que choca con el glosario. Se invita
   al jugador y se muestra el club EA que declaró (`PlayerExternalClubAssociation`: nombre,
   escudo, plataforma). Así el diálogo se parece a la referencia sin crear ese concepto. Al
   aceptar, ese club sugiere el nombre del equipo. Conectar el club EA queda para después,
   desde el flujo de capitán que ya existe.
2. **Agregado nuevo `EntryInvitation` en `@futrob/competitions`.** Se descarta ampliar
   `OrganizationInvitation`. Esa invitación da acceso, no inscribe (DEC-071), y mezclar ambas
   cosas rompería la regla. La nueva termina en una `CompetitionEntry`, que es un agregado de
   `competitions`.
3. **Dos canales en una sola tabla.** `directed` (por `inviteeActorId`, un solo uso) y `link`
   (por token, varios usos). Solo puede haber un enlace activo por competición, garantizado con
   un índice único parcial. Regenerarlo revoca el anterior en la misma transacción.
4. **La inscripción aceptada queda `approved`. (abierta)** El organizador ya eligió al invitado,
   así que repetir la aprobación sería redundante. Al aceptar se comprueba el cupo y se responde
   `competitions.capacity_reached` si está lleno. Alternativa: dejar `pending` las que llegan por
   enlace, porque cualquiera con el enlace puede usarlo.
5. **El enlace sigue activo mientras la competición admita cambios de participantes** (`draft` o
   `registration`) y no se haya regenerado ni desactivado. No caduca por tiempo. Una invitación
   dirigida caduca a los 14 días, igual que la de plantilla.
6. **La búsqueda de jugadores expone lo mínimo. (abierta)** Se busca por prefijo de gamertag,
   con 3 caracteres como mínimo y 10 resultados como máximo. Devuelve gamertag, plataforma y el
   club declarado más reciente. Requiere `competitions.invitations.manage` sobre la competición.
   Usa el rate limit de la BFF.
7. **La aceptación es un flujo en `apps/api`.** Tiene la misma forma y la misma idempotencia que
   `CompetitionApplicationFlow`:
   1. Inspección de solo lectura: la invitación es válida y el actor es el destinatario o tiene
      el enlace.
   2. La competición está en `draft` o `registration` y el actor no tiene plantilla en ella.
   3. `CreateApplicantTeam` en la organización anfitriona, con clave `<key>:team`.
   4. Inscripción `approved` con clave `<key>:entry` y comprobación de cupo.
   5. `ClaimApplicantCaptaincy`.
   6. Marcar la invitación como aceptada (dirigida) o registrar el canje (enlace).

   Todo corre en una transacción. Un reintento con la misma clave devuelve el mismo resultado.

8. **Permiso.** Se reutiliza `competitions.invitations.manage`, que ya existe, y se añade la
   guarda `canEditParticipants`. Para aceptar no hace falta ningún permiso de organización
   (igual que en ADR-0019).
9. **Actividad.** `ACTIVITY_KIND.entryInvitation` abre una fila para el invitado directo y la
   cierra al aceptar, rechazar o revocar. Se escribe en la misma transacción, como
   `rosterInvitation`.

## Forma de los datos

```text
EntryInvitation
  id, organizationId, competitionId
  channel: "directed" | "link"
  inviteeActorId | null        (directed)
  tokenHash | null             (link)
  message | null               (≤ 280)
  status: pending → accepted | declined | revoked | expired
          (link: pending → revoked; las aceptaciones viven en el ledger)
  invitedByActorId, createdAt, expiresAt | null, respondedAt | null
  acceptedEntryId | null       (directed)

EntryInvitationRedemption (solo link)
  invitationId, actorId, entryId, redeemedAt      UNIQUE(invitationId, actorId)
```

Invariantes:

- Como máximo un `link` en `pending` por competición.
- Como máximo una `directed` en `pending` por par (competición, invitado).
- Aceptar nunca supera el cupo.
- Un actor tiene como máximo un equipo por competición (regla que ya existe en plantillas).

## Superficie

| Capa      | Añadir                                                                                                                                                                                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migración | `0055_competition_entry_invitations.sql`: dos tablas, FK a `actors`, índices únicos parciales                                                                                                                                                                                                                               |
| Dominio   | `EntryInvitation`, `assessEntryInvitationEligibility`, errores `competitions.entry_invitation_*`, `EntryInvitationRepository`, `EntryInvitationTokenPort`                                                                                                                                                                   |
| Casos uso | `InviteTeamCaptain`, `GetOrCreateEntryInvitationLink`, `RegenerateEntryInvitationLink`, `RevokeEntryInvitation`, `ListCompetitionEntryInvitations`, `ListMyEntryInvitations`, `InspectEntryInvitation`, `DeclineEntryInvitation`                                                                                            |
| `teams`   | `SearchPlayerProfiles` y un puerto de lectura (prefijo de gamertag con el club declarado)                                                                                                                                                                                                                                   |
| API       | `GET/POST …/competitions/:comp/entry-invitations`, `GET/POST …/entry-invitations/link` (`POST` regenera), `DELETE …/entry-invitations/:id`, `GET /players/search?q=`, `GET /players/me/entry-invitations`, `POST /entry-invitations/accept`, `POST /entry-invitations/:id/decline`, `GET /entry-invitations/inspect?token=` |
| Contratos | Esquemas zod en `api-contracts/v1/competitions`, OpenAPI y rate limit                                                                                                                                                                                                                                                       |
| SDK y CLI | `sdk.competitions.entryInvitations.*` y `buildEntryInvitationShareUrl`; CLI `comp-invite-team`, `comp-invite-link`, `entry-invite-accept`                                                                                                                                                                                   |
| Web       | Rutas BFF; `InviteTeamDialog` (vista pura) con contenedor; lista «Invitaciones enviadas» en `ParticipantsStep`; nuevo texto del estado vacío; página `/entry-invitations/accept/:token` con reanudación tras autenticarse; ítem en Mis invitaciones                                                                         |
| Docs      | ADR-0023, que extiende ADR-0019; glosario `EntryInvitation`; AC-COMP-INV-001…004; DEC-072                                                                                                                                                                                                                                   |

El móvil (FTR-MOB-002, deep link con token) queda fuera de esta entrega y se registra como pendiente.

## Comprobación de paralelismo

- **Pasos bloqueantes:** responder las decisiones 1, 4 y 6, y fijar los esquemas de
  `api-contracts`. Todo lo demás depende de esos tipos.
- **Frentes independientes:**
  - A: backend (dominio, migración, flujo, rutas, SDK y CLI).
  - B: diálogo y stories, construidos con fixtures tipados por los contratos.
  - C: página de aceptación y bandeja.
- **Estado compartido:** `api-contracts` lo escribe solo A. `competitions-story-client.ts` y
  sus fixtures, solo B. `query-keys.ts`, solo C. `create-modules.ts` lo toca únicamente A.
- **División mínima segura:** tres trabajadores después de los contratos. B no necesita la API
  porque la vista es pura. C sí espera las rutas BFF de A para la verificación en vivo, pero
  puede avanzar las stories antes.

## Tareas

- **T0.** ADR-0023, glosario, DEC-072 y criterios de aceptación. Esquemas en `api-contracts`.
- **T1.** Dominio, puertos, errores y casos de uso de `EntryInvitation`, con harness en memoria.
- **T2.** Migración `0055`, repositorio Postgres y repositorio en memoria, con un test de
  contrato compartido.
- **T3.** `EntryInvitationAcceptanceFlow` en `apps/api` y su composición en `di/`.
- **T4.** Rutas HTTP, OpenAPI y rate limit. `SearchPlayerProfiles`.
- **T5.** SDK, rutas BFF y comandos de CLI.
- **T6.** Proyección de actividad (`entry_invitation`) y su backfill.
- **T7.** `InviteTeamDialog` con su vista y stories, la lista de enviadas y el estado vacío.
- **T8.** Página de aceptación y elemento en Mis invitaciones, con stories.
- **T9.** Verificación en vivo con `verify-futrob`, en la web y con la CLI.

## Tests: comportamiento, no implementación

Cada test llama al sujeto como lo haría su consumidor y comprueba un resultado literal. Antes de
quedarse un test, debe fallar si el sujeto deja de producir su efecto (prueba de sabotaje).

**Dominio y casos de uso** (`competitions`, en memoria):

- Aceptar una invitación dirigida produce una inscripción `approved` con el nombre que dio el
  capitán, y el actor es capitán de ese equipo. Se comprueba leyendo las inscripciones de la
  competición, no con `toHaveBeenCalled`.
- Repetir la aceptación con la misma `creationKey` devuelve la misma `entryId`. Con otra clave
  responde `teams.roster_competition_conflict`.
- Aceptar con el cupo lleno responde `competitions.capacity_reached` y no crea equipo. Va
  acompañado de un caso positivo con una plaza libre.
- Tras regenerar el enlace, el token anterior responde `competitions.entry_invitation_revoked`
  y el nuevo se acepta.
- Una invitación dirigida aceptada por otro actor responde `…_not_recipient`.
- Con la competición `published`, aceptar responde `competitions.not_editable`.
- `SearchPlayerProfiles("con")` devuelve `condor10` con su club y omite `ricardo`. Con
  `"co"` (menos de 3 caracteres) responde error de validación.

**API** (`competitions-entry-invitations.test.ts`):

- Estado HTTP y cuerpo exactos para invitar, aceptar, rechazar, revocar y regenerar.
- 403 sin `competitions.invitations.manage`.
- El token en claro solo aparece en la respuesta de crear o regenerar, nunca en listados.

**Postgres:** test de contrato compartido con el repositorio en memoria. Incluye que el índice
único rechace un segundo enlace activo.

**Web (unidad):** `buildWhatsAppShareUrl("https://futrob.app/e/abc", "Liga Interclubes")` es
igual a una URL literal. Se elimina `redactInvitationTokenFromPath` para la ruta nueva.

**No se escriben:** tests que fijen constantes de copy, el orden de llamadas a puertos o la
mera existencia del diálogo.

## Storybook

`apps/web/src/modules/competitions/presentation/invite-team-dialog.stories.tsx`, con título
`Product/Competitions/Setup/Invite team`. La vista es pura: recibe los resultados de búsqueda,
el estado del enlace y los callbacks. Por eso las stories no necesitan red. Se usa `fn()` de
`storybook/test` para capturar las llamadas.

| Story                       | Estado                                | `play` (pruebas)                                                                                                                                                                 |
| --------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Playground`                | Disparador cerrado                    | Pulsar **Invitar equipo** abre un diálogo con el nombre accesible «Invitar equipo». Con Escape se cierra y el foco vuelve al disparador.                                         |
| `FutrobSearch`              | Resultados para «Cón»                 | Escribir «Cón», elegir «Cóndor FC», escribir un mensaje y enviar: `onInvite` recibe `{ inviteeActorId: "act-condor", message: "¡Hola!…" }`. El pie dice «1 equipo seleccionado». |
| `FutrobNoResults`           | Búsqueda sin coincidencias            | Aparece «Ningún jugador coincide» y **Enviar invitación** está deshabilitado.                                                                                                    |
| `FutrobSending`             | Enviando                              | El botón está deshabilitado, con `aria-busy`.                                                                                                                                    |
| `FutrobError`               | `competitions.capacity_reached`       | Alerta con el texto traducido, y el formulario conserva la selección.                                                                                                            |
| `LinkActive`                | Enlace listo                          | Cambiar a **Por enlace** con el teclado (flechas). **Copiar enlace** muestra «Copiado». **Compartir por WhatsApp** tiene `href` igual a la URL literal y `target="_blank"`.      |
| `LinkRegenerate`            | Confirmación al regenerar             | Confirmar llama a `onRegenerate` y la URL que se ve cambia a la nueva.                                                                                                           |
| `LinkLoading` / `LinkError` | Cargando / error                      | Esqueleto y alerta con **Reintentar**.                                                                                                                                           |
| `Locked`                    | Competición `published` o sin permiso | El disparador está deshabilitado y lleva una descripción.                                                                                                                        |
| `MobileViewport`            | 375 px                                | Las pestañas y el pie caben y los objetivos táctiles miden 44 px o más.                                                                                                          |

Se añaden dos stories a `ParticipantsStep` (`competition-setup-participants.stories.tsx`):
`EmptyWithInvite` (el estado vacío con el CTA) y `WithSentInvitations` (la lista de enviadas con
**Revocar**). La página de aceptación tiene `Valid`, `Expired`, `Revoked`, `CapacityReached` y
`AlreadyInCompetition`.

Las pruebas corren con el proyecto `storybook` de Vitest (`@storybook/addon-vitest`, Chromium) y
con el addon a11y. Verificación: `npm run test` (incluye ese proyecto) y `npm run storybook:build`.
El resultado del build y la revisión visual se informan por separado.

## Riesgos

- **Privacidad de la búsqueda.** Cualquier organizador puede listar gamertags y clubes declarados
  (decisión 6).
- **Enlace aprobado automáticamente.** Si se filtra fuera del grupo previsto, entran equipos
  desconocidos hasta llenar el cupo. Se mitiga regenerando y quitando participantes (decisión 4).
- **Cupo sin bloqueo de filas.** Hereda el riesgo de ADR-0019: dos aceptaciones simultáneas
  pueden superarlo por uno.
- **Copy del estado vacío.** Hoy dice «cuando alguien se postule con las inscripciones abiertas».
  En `draft` pasa a ofrecer invitar.
