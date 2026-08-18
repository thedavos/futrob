# Futrob MVP — Requisitos verificables

**Versión de contrato:** 2.0  
**Fuente base:** [prd.md](/product/prd.md)  
**Precedencia:** solicitud vigente del usuario > este documento > defaults de [open-decisions.md](/product/open-decisions.md).

## 1. Objetivo y resultado del MVP

Futrob debe permitir que un organizador opere de extremo a extremo una competición web de **EA SPORTS FC Clubs**: desde organización y equipos hasta fixture, sincronización con EA, selección de partidos oficiales, confirmación, estadísticas, rankings y portal público.

El MVP se considera funcional cuando se puede completar el recorrido E2E descrito en `AC-E2E-001` de [acceptance-criteria.md](/product/acceptance-criteria.md), incluidos aislamiento por organización, auditoría y publicación.

## 2. Convenciones de prioridad

- **Must:** condición necesaria para declarar el MVP completo.
- **Should:** se implementa después de los Must; una omisión se reporta como alcance parcial.
- **Could:** mejora permitida si no compromete Must/Should.
- **Won't:** exclusión explícita del MVP.

## 3. Requisitos Must

### 3.1 Acceso, organizaciones y roles

| ID             | Requisito verificable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-01          | Crear organizaciones, asignar roles contextuales (superusuario, organizador, staff, capitán, subcapitán, jugador, espectador) y aislar datos privados por organización.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| FTR-AUTH-001   | Autenticar usuarios en la web con Better Auth y asociar cada sesión a un actor Futrob verificable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| FTR-AUTH-002   | Después del registro, entrar directamente al onboarding. Después del login, consultar primero si el actor completó el onboarding y solo entonces resolver su destino por membresías.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| FTR-AUTH-003   | Persistir por actor si completó el onboarding, junto con fecha, versión y camino elegido; si no lo completó, impedir destinos autenticados y redirigirlo al onboarding.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| FTR-PLAYER-001 | Permitir que un actor autenticado cree y use un perfil personal de jugador sin organización ni invitación.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| FTR-PLAYER-002 | Permitir registrar uno o más identificadores de EA en el perfil personal, junto con plataforma y edición, sin solicitar credenciales ni verificar propiedad. El identificador queda utilizable inmediatamente para correlacionar partidos y estadísticas; plataforma y edición aportan el contexto requerido por la API.                                                                                                                                                                                                                                                                                     |
| FTR-PLAYER-003 | Mostrar al jugador sus partidos oficiales y estadísticas individuales derivadas de resultados oficiales aprobados, aunque no tenga membresía de organización.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| FTR-PLAYER-004 | Permitir aceptar posteriormente una invitación emitida desde una competición y añadir acceso contextual a esa competición, junto con la membresía mínima de organización requerida por tenancy, sin perder el perfil personal ni su historial. La aceptación no añade al jugador a una plantilla.                                                                                                                                                                                                                                                                                                            |
| FTR-PLAYER-005 | Permitir que un PlayerProfile asocie opcionalmente uno o más ExternalClub declarados. Estas asociaciones no crean un Team, una CompetitionEntry ni una membresía de Roster, y no verifican propiedad.                                                                                                                                                                                                                                                                                                                                                                                                        |
| FTR-PLAYER-006 | Mostrar en Mis partidos las observaciones recientes (`ProviderMatch`) del ExternalClub seleccionado en el selector de contexto. Sin al menos un `PlayerExternalClubAssociation` no se consulta al proveedor. Si hay varios clubes asociados, el valor inicial es el primero hasta que el jugador elija otro. El identificador de juego no sustituye al club: después de traer esos partidos, clasifica si alineó con el club seleccionado (jugado) o no («No jugaste»: alineó con el rival o no aparece en el partido). Estas observaciones no alimentan `PlayerPersonalStats` ni proyecciones competitivas. |
| FTR-ORG-001    | Exigir un nombre de organización de 1–120 caracteres y único globalmente bajo normalización de mayúsculas, espacios y Unicode. La disponibilidad se comprueba antes de configurar la primera competición y la restricción se garantiza en persistencia.                                                                                                                                                                                                                                                                                                                                                      |
| FTR-ORG-002    | Los datos privados deben estar aislados por organización en lectura, escritura, jobs y storage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| FTR-RBAC-002   | Un espectador solo consume información publicada; un jugador personal consulta sus propios datos; un capitán solo administra su equipo; el organizador/staff opera la competición según permisos granulares.                                                                                                                                                                                                                                                                                                                                                                                                 |

### 3.2 Competiciones, ediciones y formatos

| ID           | Requisito verificable                                                                                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-02        | Crear competiciones vinculadas a edición del juego, modalidad (FC Clubs en MVP), plataforma/generación, región y zona horaria. Esos vínculos no cambian tras iniciar la competición.                                                      |
| FR-03        | Configurar formatos MVP (liga, eliminación directa, grupos + eliminación, liga con playoffs), etapas, jornadas/rondas y criterios de desempate.                                                                                           |
| FTR-COMP-001 | Un organizador debe poder guardar y reanudar identidad, formato, reglas y participantes de una competición en borrador; publicarla con al menos dos participantes aprobados; y, desde ese momento, tratar su estructura como no editable. |

### 3.3 Equipos, clubes EA y plantillas

| ID             | Requisito verificable                                                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-04          | Registrar equipos, capitanes, subcapitanes y plantillas; asociar operativamente el club de EA (búsqueda por nombre, selección, persistencia de identificador, nombre, plataforma y edición) para localizar partidos. |
| FTR-TEAM-001   | La asociación Team ↔ club EA es declarativa y no afirma ni verifica cuenta o propiedad; no condiciona la aprobación de la inscripción.                                                                               |
| FTR-TEAM-002   | Un jugador pertenece como máximo a un Team por Competition; puede pertenecer a varios Teams en competiciones distintas y declarar el mismo identificador EA en varias plataformas.                                   |
| FTR-ROSTER-001 | La plantilla soporta invitaciones, roles, elegibilidad y alineaciones según reglas de la competición.                                                                                                                |
| FTR-ROSTER-002 | El espacio personal permite listar las membresías de plantilla del actor y marcar una como equipo activo (`ActiveTeamPreference`); la preferencia no altera elegibilidad.                                            |

### 3.4 Fixtures, enfrentamientos y partidos oficiales

| ID          | Requisito verificable                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-05       | Generar y modificar fixtures con jornadas/rondas, enfrentamientos y byes determinísticos.                                                                                |
| FR-06       | Configurar uno o dos partidos oficiales por enfrentamiento.                                                                                                              |
| FR-07       | Resolver el enfrentamiento por partidos independientes (puntos/resultado por partido) o por marcador agregado.                                                           |
| FTR-DOM-001 | Jerarquía obligatoria: `Competition → Stage → Round → Encounter → OfficialMatch`. La `Series` es la regla de resolución del enfrentamiento sobre sus partidos oficiales. |
| FTR-DOM-002 | Distinguir `Encounter`, `OfficialMatch`, `EaMatch` y `Series`. No son intercambiables.                                                                                   |
| FTR-FIX-002 | Motores de fixture, standings, desempates y bracket son puros, determinísticos e idempotentes.                                                                           |

### 3.5 Reprogramación

| ID          | Requisito verificable                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| FR-08       | Solicitar, negociar y aprobar reprogramaciones de enfrentamiento completo o de un partido oficial específico.                           |
| FTR-SCH-001 | Capitanes/subcapitanes autorizados y organizador/staff pueden iniciar o resolver solicitudes según reglamento.                          |
| FTR-SCH-002 | No se puede reprogramar un partido aprobado o finalizado; se conserva historial; una solicitud activa bloquea propuestas incompatibles. |
| FTR-SCH-003 | Tras aceptar, se actualiza la programación y se recalcula la ventana de búsqueda de candidatos EA.                                      |

### 3.6 Integración EA Clubs

| ID         | Requisito verificable                                                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-09      | Consultar y persistir datos obtenidos desde `proclubs.ea.com/api` detrás de un puerto desacoplado, con caché, reintentos, observabilidad y revisión manual cuando EA falle. |
| FR-10      | Mostrar partidos candidatos entre dos rivales dentro de una ventana temporal alrededor del horario programado.                                                              |
| FR-12      | Detectar duplicados e impedir reutilizar un `eaMatchId` en dos partidos oficiales distintos.                                                                                |
| FTR-EA-001 | Conservar payload JSON original e inmutable, hash, fechas de observación, proveedor, edición, plataforma, marcador, duración, stats de equipo/jugador y estado de sync.     |
| FTR-EA-002 | Las sincronizaciones y jobs son idempotentes; observaciones posteriores del mismo partido pueden versionarse sin corromper el original.                                     |

### 3.7 Selección, confirmación y disputas

| ID          | Requisito verificable                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-11       | Permitir seleccionar y confirmar partidos oficiales desde candidatos EA en el Match Center.                                                                       |
| FTR-SEL-001 | Un capitán propone la selección; el rival confirma, rechaza o propone otra; acuerdo puede aprobar automáticamente según reglas; desacuerdo escala al organizador. |
| FTR-SEL-002 | Antes de guardar se muestra previsualización del resultado individual o agregado.                                                                                 |
| FTR-SEL-003 | Solo partidos aprobados alimentan estadísticas oficiales; cambiar una selección aprobada requiere permiso y deja auditoría.                                       |
| FR-15       | Gestionar disputas básicas, sanciones y auditoría append-only de acciones sensibles.                                                                              |

### 3.8 Resultados, estadísticas, rankings y portal

| ID          | Requisito verificable                                                                                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-13       | Guardar estadísticas oficiales de equipo y jugador derivadas de partidos oficiales aprobados.                                                                                                                         |
| FR-14       | Actualizar tabla, bracket, rankings y premios; las agregaciones deben reconstruirse desde partidos oficiales.                                                                                                         |
| FR-18       | Proveer un espacio personal autenticado para que un jugador consulte sus partidos (recientes de proveedor y oficiales de competición), estadísticas oficiales y datos individuales sin pertenecer a una organización. |
| FR-16       | Publicar portal de competición con información sanitizada (portada, reglamento, equipos, calendario, resultados, tabla, bracket, rankings, perfiles públicos).                                                        |
| FR-17       | Proteger analíticas premium mediante suscripción o permisos.                                                                                                                                                          |
| FTR-PUB-001 | Datos privados, tokens, identificadores de plataforma internos y payloads EA crudos no llegan al portal público.                                                                                                      |

### 3.9 Superficies web y notificaciones

| ID          | Requisito verificable                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FTR-WEB-001 | Landing pública responsive con propuesta de valor FC Clubs / datos EA, creación y acceso.                                                                              |
| FTR-WEB-002 | Shell autenticado con espacio personal, organización, competición, Match Center, fixtures, standings/bracket, equipos, disputas, analytics y settings según permiso.   |
| FTR-NTF-001 | Notificar por web y correo: inscripción, partido próximo, reprogramación, candidatos EA, selección propuesta, resultado/disputa, decisión del organizador y sanciones. |

## 4. Requisitos Should

| ID             | Requisito                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| FTR-ANA-001    | Primera capa de analíticas premium para equipo, jugador y organizador.                                          |
| FTR-RNK-001    | Ranking de equipos por rendimiento (0–100) con fórmula transparente y versionada, distinto de la tabla oficial. |
| FTR-ELIG-001   | Mínimos de elegibilidad para premios/rankings (partidos, minutos, % participación).                             |
| FTR-HEALTH-001 | Panel o eventos de salud/latencia del proveedor EA.                                                             |

## 5. Requisitos Won't (MVP)

| ID      | Exclusión                                                          |
| ------- | ------------------------------------------------------------------ |
| WONT-01 | Aplicación móvil nativa.                                           |
| WONT-02 | FC Temporadas y FC Amistosos como modalidades operativas.          |
| WONT-03 | Marketplace, fantasy, streaming propio, white-label completo.      |
| WONT-04 | Doble eliminación, sistema suizo, divisiones con ascenso/descenso. |
| WONT-05 | Automatización de pagos y premios.                                 |
| WONT-06 | Predicciones con IA.                                               |
| WONT-07 | OCR de capturas como fuente primaria de resultados.                |
| WONT-08 | WhatsApp/Telegram/push como canales operativos del MVP.            |
| WONT-09 | API pública de terceros.                                           |

## 6. Requisitos no funcionales

| ID     | Requisito                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-01 | Arquitectura desacoplada del proveedor EA.                                                                                           |
| NFR-02 | Procesamiento idempotente de sincronizaciones, selecciones, oficializaciones y notificaciones.                                       |
| NFR-03 | Caché, deduplicación, reintentos con backoff y circuit breaker hacia EA.                                                             |
| NFR-04 | Persistencia del payload original y capacidad de reprocesar estadísticas sin volver a consultar EA.                                  |
| NFR-05 | Auditoría de acciones sensibles con actor, motivo, correlación y tiempo.                                                             |
| NFR-06 | Control de acceso por organización, competición, equipo y perfil personal; un jugador solo puede leer su propia proyección personal. |
| NFR-07 | Manejo correcto de zonas horarias (IANA).                                                                                            |
| NFR-08 | Diseño responsive y accesible (WCAG 2.2 AA).                                                                                         |
| NFR-09 | Observabilidad de jobs, errores y salud del proveedor.                                                                               |

## 7. Modelo de datos conceptual

Entidades conceptuales mínimas (nombres de persistencia orientativos):

`organizations`, `organization_memberships`, `users`, `actors`, `actor_onboarding`, `player_profiles`, `game_editions`, `competitions`, `competition_stages`, `competition_rules`, `rounds`, `teams`, `competition_roster_memberships`, `active_team_preferences`, `players`, `player_game_accounts`, `competition_entries`, `competition_encounters`, `competition_matches`, `schedule_change_requests`, `schedule_change_proposals`, `ea_club_connections`, `ea_sync_jobs`, `ea_raw_match_observations`, `ea_matches`, `ea_team_match_stats`, `ea_player_match_stats`, `match_candidates`, `official_match_selections`, `match_confirmation_actions`, `match_disputes`, `sanctions`, `team_competition_stats`, `player_competition_stats`, `player_personal_stats`, `ranking_snapshots`, `analytics_snapshots`, `provider_health_events`, `audit_logs`.

## 8. Roadmap por fases

1. **Fundamentos** — auth, perfiles personales de jugador, organizaciones, roles, competiciones, equipos y plantillas.
2. **Operación competitiva** — fixtures, enfrentamientos, reprogramaciones, Match Center, portal.
3. **EA Data Layer** — vinculación, sync, almacenamiento, normalización, observabilidad.
4. **Resultados oficiales** — candidatos, selección, confirmación, disputas, agregado, proyecciones.
5. **Estadísticas y premium** — rankings, premios, analíticas.
6. **Expansión** — otras modalidades, móvil, white-label, más integraciones.

## 9. Trazabilidad

Ver [acceptance-criteria.md](/product/acceptance-criteria.md), [domain-glossary.md](/product/domain-glossary.md) y [open-decisions.md](/product/open-decisions.md).
