# Futrob MVP — Glosario de dominio

**Propósito:** lenguaje ubicuo para producto, dominio, API, persistencia, UI y pruebas. Los términos en inglés son nombres canónicos de código; la UI puede traducirlos sin cambiar su significado.

**Fuente:** [prd.md](/product/prd.md)

## 1. Tenancy, identidad y acceso

| Término                          | Definición canónica                                                             | Regla o límite                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **User**                         | Identidad autenticable.                                                         | No concede permisos por sí sola.                                                                        |
| **Actor**                        | Identidad de negocio estable resuelta desde el proveedor de auth.               | Los aggregates referencian `ActorId`, no tablas de auth.                                                |
| **Organization**                 | Tenant que agrupa marca, staff y competiciones.                                 | Todo dato administrativo privado pertenece a una organización.                                          |
| **OrganizationMember**           | Relación User/Actor ↔ Organization con rol y estado.                            | Es opcional para un Player; los roles son contextuales y no se comparten entre orgs.                    |
| **PlatformAdmin / Superusuario** | Opera la plataforma Futrob.                                                     | Acceso excepcional, acotado y auditado.                                                                 |
| **Organizer**                    | Administra organización o competición.                                          | Crea reglas, fixtures, aprueba inscripciones, resuelve disputas.                                        |
| **CompetitionStaff**             | Rol delegado con permisos granulares.                                           | No implica ownership de la organización.                                                                |
| **Captain**                      | Representa un Team en una competición.                                          | Vincula club EA, plantilla, reprogramaciones y selección oficial.                                       |
| **ViceCaptain / Subcapitán**     | Permisos delegados del capitán.                                                 | Alcance configurable.                                                                                   |
| **Player**                       | Perfil gamer vinculado a un Actor, con o sin participación en una organización. | Puede consultar su proyección personal; solo ocupa un slot de fixture cuando pertenece a una plantilla. |
| **Spectator**                    | Consume portal público.                                                         | Sin datos administrativos ni disputas privadas.                                                         |
| **PlayerProfile**                | Espacio personal de un jugador autenticado.                                     | No requiere organización; expone solo datos propios permitidos.                                         |
| **ActorOnboarding**              | Estado de onboarding asociado a un Actor.                                       | Persiste finalización, fecha, versión y camino; no pertenece a Better Auth ni al perfil del jugador.    |

## 2. Edición, modalidad y competición

| Término                   | Definición canónica                                                                           | Regla o límite                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **GameEdition**           | Edición del videojuego (`FC 25`, `FC 26`, …).                                                 | Configurable; versiona reglas y esquemas de datos EA.             |
| **Modality**              | Familia de juego. MVP: **FC Clubs**.                                                          | Futuras: Temporadas, Amistosos, individual/parejas.               |
| **Competition**           | Liga, copa o torneo configurado.                                                              | Vinculada a edición + modalidad al crear; no cambia tras iniciar. |
| **CompetitionRules**      | Reglamento versionado: desempates, reprogramaciones, partidos por enfrentamiento, resolución. | La versión efectiva debe reconstruirse históricamente.            |
| **Stage**                 | Etapa: grupos, temporada regular, playoffs, etc.                                              | Contiene rounds/jornadas.                                         |
| **Round / Jornada**       | Agrupa enfrentamientos en una fecha o fase.                                                   | No es un partido.                                                 |
| **Platform / Generation** | Plataforma de juego y generación.                                                             | Declarada en competición y conexión EA.                           |

## 3. Equipos y plantillas

| Término                        | Definición canónica                                                 | Regla o límite                                                    |
| ------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Team**                       | Unidad competitiva que ocupa fixtures, tabla y bracket.             | En MVP FC Clubs es un club/equipo; no se asume 1v1 individual.    |
| **CompetitionEntry**           | Inscripción de un Team en una Competition.                          | Puede requerir verificación de club EA.                           |
| **Roster / CompetitionRoster** | Plantilla versionada de jugadores del Team en la competición.       | Elegibilidad contextual y temporal.                               |
| **PlayerGameAccount**          | Cuenta de juego (gamertag / EA) asociada a un PlayerProfile/Player. | Identificador, plataforma y edición; no requiere credenciales EA. |
| **EaClubConnection**           | Vínculo entre Team y club EA (id, nombre, plataforma, edición).     | Persistido tras búsqueda y selección del capitán.                 |

## 4. Jerarquía competitiva

```text
Competition
└── Stage
    └── Round
        └── Encounter (enfrentamiento programado)
            ├── OfficialMatch 1
            ├── OfficialMatch 2 (opcional)
            └── Series (regla de resolución sobre los OfficialMatch)
```

| Término                 | Definición canónica                                        | Invariante                                                     |
| ----------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| **Encounter**           | Cita programada entre dos Teams.                           | Contiene uno o más espacios de partido oficial.                |
| **OfficialMatch**       | Unidad competitiva que cuenta para el Encounter.           | Puede asociarse a cero o un `EaMatch` aprobado.                |
| **Series**              | Regla de resolución del Encounter sobre sus OfficialMatch. | Modos MVP: partidos independientes o marcador agregado.        |
| **Independent matches** | Cada OfficialMatch produce su propio resultado/puntos.     | En liga, cada partido puede puntuar por separado.              |
| **Aggregate score**     | Suma de goles de los OfficialMatch para decidir la serie.  | Desempates según CompetitionRules; no asumir gol de visitante. |
| **Bye**                 | Avance sin rival.                                          | No crea marcador ni estadísticas ficticias.                    |
| **Standing**            | Tabla/proyección derivada de resultados oficiales.         | Reconstruible e idempotente.                                   |
| **Bracket**             | Grafo de avance en eliminación.                            | Proyección; el layout visual pertenece a presentación.         |

## 5. Capa game-data (proveedores externos)

| Término                           | Definición canónica                                                     | Regla o límite                                                |
| --------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| **game-data**                     | Bounded context que normaliza datos de fuentes externas.                | Único dueño de adapters de proveedor; EA Clubs es un adapter. |
| **GameDataProviderKey**           | Identificador de fuente (`ea-clubs`, `manual`, …).                      | Parte de la identidad externa.                                |
| **ProviderMatch**                 | Partido normalizado de cualquier proveedor.                             | No es resultado oficial de competición.                       |
| **ExternalClub / ExternalClubId** | Club en un proveedor externo.                                           | Identidad `UNIQUE(provider_key, external_id[, edition])`.     |
| **ExternalReference**             | `{ providerKey, externalId }`.                                          | Reemplaza `eaMatchId` suelto.                                 |
| **RawProviderObservation**        | Payload original e inmutable + hash.                                    | Nunca se muta; nuevas observaciones versionan.                |
| **ProviderSyncJob**               | Trabajo de sincronización idempotente.                                  | Queues + retries + health.                                    |
| **MatchCandidate**                | ProviderMatch presentado para un OfficialMatchSlot en ventana temporal. | Filtrado por participantes y horario.                         |
| **OfficialMatchSelection**        | Asignación de candidatos a slots.                                       | Un `ExternalReference` no puede usarse en dos OfficialMatch.  |
| **ConfirmationAction**            | Propuesta / confirmación / rechazo / contrapropuesta.                   | Acuerdo puede auto-aprobar; desacuerdo escala.                |

### Estados sugeridos de selección

`awaiting_provider_data` → `candidates_available` → `selection_in_progress` → `awaiting_opponent_confirmation` → `confirmed` → `disputed` | `organizer_review` → `approved` | `voided`.

## 6. Reprogramación

| Término                    | Definición canónica                                                             | Regla o límite                                          |
| -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **ScheduleChangeRequest**  | Solicitud formal de cambio de horario.                                          | Alcance: Encounter completo u OfficialMatch específico. |
| **ScheduleChangeProposal** | Propuesta o contrapropuesta con fecha, motivo, expiración y evidencia opcional. | Una solicitud activa bloquea otras incompatibles.       |

Estados sugeridos: `draft`, `pending_opponent`, `counter_proposal`, `accepted`, `rejected`, `expired`, `escalated`, `resolved_by_organizer`, `cancelled`.

## 7. Resultados, disputas y estadísticas

| Término                                           | Definición canónica                                   | Regla o límite                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Official result**                               | Resultado aprobado que alimenta proyecciones.         | Solo OfficialMatch/Encounter aprobados actualizan standings, bracket, rankings y portal.             |
| **MatchDispute**                                  | Desacuerdo sobre selección o resultado.               | Resolución por organizador/staff autorizado.                                                         |
| **Sanction**                                      | Penalización administrativa.                          | Auditada; puede afectar elegibilidad o walkover.                                                     |
| **TeamCompetitionStats / PlayerCompetitionStats** | Agregados oficiales.                                  | Reconstruibles desde OfficialMatch aprobados.                                                        |
| **RankingSnapshot**                               | Instantánea versionada de rankings.                   | Incluye elegibilidad por mínimos.                                                                    |
| **Performance ranking**                           | Score 0–100 distinto de la tabla oficial.             | Fórmula transparente y estable durante la competición.                                               |
| **AnalyticsSnapshot**                             | Datos premium agregados.                              | Protegidos por suscripción/permiso.                                                                  |
| **PlayerPersonalStats**                           | Proyección de estadísticas propias del PlayerProfile. | Solo usa partidos oficiales aprobados y nunca expone payloads raw, disputas o datos administrativos. |

## 8. Publicación, comunicaciones y auditoría

| Término                 | Definición canónica                                          | Regla o límite                                             |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| **Public portal**       | Superficie pública de una Competition publicada.             | Solo proyecciones sanitizadas.                             |
| **Notification**        | Aviso web o email en el MVP.                                 | WhatsApp/push son ampliaciones posteriores.                |
| **AuditLog**            | Registro append-only.                                        | Actor, fuente, antes/después, motivo, correlación, tiempo. |
| **ProviderHealthEvent** | Evento de salud/latencia/error de un proveedor de game-data. | Observabilidad; no es resultado competitivo.               |

## 9. Términos retirados o renombrados

- `ea-data` / `EaMatch` / `EaClubId` como nombres de bounded context o dominio → usar **game-data** / **ProviderMatch** / **ExternalClubId** (EA solo en adapters).
- Evidence / OCR como fuente primaria Must (OCR puede ser un adapter futuro de game-data, no el camino feliz).
- Entrant individual/pair/squad como unidad por defecto (slot = **Team**).
- Match → Series → Game del modelo anterior → **Encounter → OfficialMatchSlot + Series (resolución)**.
- WhatsApp/Telegram como ingreso Must de resultados del MVP.
