# Futrob MVP — Decisiones abiertas y defaults

**Regla de uso:** ninguna decisión de este documento bloquea el setup fundacional. Hasta que producto la cambie explícitamente, se aplica el default recomendado y se versiona cuando afecte resultados históricos.

**Precedencia:** solicitud vigente del usuario > [prd.md](/product/prd.md) > defaults de este documento.

## 1. Decisiones resueltas por el PRD vigente

| ID      | Tema                          | Resolución vigente                                                                                                                                                                                                                                                                                               |
| ------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 | Fuente primaria de resultados | Datos de EA Clubs (`proclubs.ea.com/api`) + selección/confirmación humana. OCR/capturas no son fuente primaria del MVP.                                                                                                                                                                                          |
| DEC-002 | Modalidad piloto              | FC Clubs. Otras modalidades son extensión.                                                                                                                                                                                                                                                                       |
| DEC-003 | Notificaciones MVP            | Web + correo. WhatsApp y push son ampliaciones.                                                                                                                                                                                                                                                                  |
| DEC-004 | Unidad competitiva            | Team (club/equipo) en fixtures, tabla y bracket.                                                                                                                                                                                                                                                                 |
| DEC-005 | Jerarquía                     | `Encounter → OfficialMatch` con `Series` como regla de resolución; `EaMatch` es dato externo.                                                                                                                                                                                                                    |
| DEC-006 | Stack de plataforma           | TanStack Start, Better Auth, Vite+, Sentry, shadcn/Base UI sobre **Cloudflare Workers**, con **D1**, **R2**, **Queues** y **Cron Triggers**. Hexagonal por feature module en `apps/web/src/modules` con DI en `src/di`. Bounded context de proveedores: **game-data** (EA como adapter). Sin Supabase ni Vercel. |

## 2. Decisiones de dominio con default

| ID      | Decisión pendiente                    | Default recomendado para MVP                                                                                           | Motivo                                   |
| ------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| DEC-010 | Partidos oficiales por enfrentamiento | 1 o 2; valores mayores quedan fuera del MVP.                                                                           | Coincide con PRD §7.                     |
| DEC-011 | Modo de resolución por defecto        | Configurable por competición; default `independent` en liga y `aggregate` en eliminación a ida/vuelta de dos partidos. | Cobertura de ambos modos sin ambigüedad. |
| DEC-012 | Gol de visitante                      | Desactivado.                                                                                                           | No inferir reglas históricas.            |
| DEC-013 | Puntos de liga                        | Victoria 3, empate 1, derrota 0.                                                                                       | Convención configurable.                 |
| DEC-014 | Desempates de liga                    | PTS → DG → GF → enfrentamiento directo → menos sanciones → sorteo manual auditado.                                     | Orden determinístico versionado.         |
| DEC-015 | Byes                                  | Avance sin marcador ni estadísticas.                                                                                   | Evita datos ficticios.                   |
| DEC-016 | Cambios a resultado aprobado          | Nueva versión + reproyección + justificación; no overwrite silencioso.                                                 | Auditoría e idempotencia.                |
| DEC-017 | Empate en eliminación                 | Aplicar desempate configurado; si falta dato, revisión del organizador. Nunca seed automático.                         | Evita avance incorrecto.                 |

## 3. Selección oficial y confirmación

| ID      | Decisión pendiente                  | Default recomendado                                                                         | Motivo                                                      |
| ------- | ----------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| DEC-020 | Quién inicia la selección           | Cualquiera de los dos capitanes (o subcapitán autorizado).                                  | Evita deadlock si el “local” no actúa.                      |
| DEC-021 | Tiempo máximo de confirmación rival | 24 horas desde la propuesta, o hasta el inicio programado si ocurre antes.                  | Balance operación/urgencia.                                 |
| DEC-022 | Auto-aprobación                     | Si ambos capitanes confirman la misma selección y no hay flags de integridad, auto-aprobar. | Reduce carga del organizador.                               |
| DEC-023 | Ventana temporal de candidatos      | ±6 horas alrededor de cada OfficialMatch programado, configurable por competición (1–24 h). | Cubre jornadas densas sin mezclar días enteros por defecto. |
| DEC-024 | Candidatos previos tras reprogramar | Se conservan; se recalcula elegibilidad/ventana con el nuevo horario.                       | No perder evidencia de sync.                                |
| DEC-025 | Partidos no seleccionados           | Permanecen para analíticas privadas/contexto; no afectan competición.                       | Separación oficial vs contextual.                           |

## 4. Reprogramación

| ID      | Decisión pendiente               | Default recomendado                                                                      | Motivo                     |
| ------- | -------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------- |
| DEC-030 | Máximo de reprogramaciones       | 2 por Team por Encounter, configurable.                                                  | Evita abuso sin rigidizar. |
| DEC-031 | Quién puede iniciar              | Capitán, subcapitán con permiso, organizador/staff.                                      | Alineado al PRD.           |
| DEC-032 | Expiración de propuesta          | 12 horas o según reglamento de competición.                                              | Fuerza resolución.         |
| DEC-033 | Escalada                         | Si expira sin acuerdo, estado `escalated` y el organizador puede fijar fecha o walkover. | Cierre operativo.          |
| DEC-034 | Fecha límite de reprogramaciones | Configurable; tras ella solo organizador/staff.                                          | Control de calendario.     |

## 5. Datos EA y estadísticas

| ID      | Decisión pendiente                | Default recomendado                                                                                                                                          | Motivo                               |
| ------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| DEC-040 | Estadísticas confiables iniciales | Marcador, duración, goles, asistencias, rating, MVP, tiros, pases y entradas cuando el payload las traiga; campos ausentes = null tipado, no cero inventado. | Evita falsos ceros.                  |
| DEC-041 | Ranking de rendimiento de equipos | Fórmula v1 versionada 0–100 basada en resultados, DG, forma reciente y eficiencia ofensiva/defensiva disponibles.                                            | Transparente y estable en temporada. |
| DEC-042 | Premios individuales              | Rankings de goles, asistencias, rating, MVP y portero; mínimos de elegibilidad configurables.                                                                | Cobertura esencial.                  |
| DEC-043 | Elegibilidad default              | Mínimo 3 partidos o 60 % de minutos del Team en la etapa, lo que el organizador configure.                                                                   | Reduce rankings engañosos.           |
| DEC-044 | Analíticas públicas vs premium    | Públicos: tabla, resultados, rankings esenciales. Premium: percentiles, evolución, comparativas y analítica de organizador.                                  | Soporta FR-17.                       |

## 6. Comercial e integraciones

| ID      | Decisión pendiente     | Default recomendado                                                                          | Motivo             |
| ------- | ---------------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| DEC-050 | Planes comerciales MVP | Un plan free operativo + flag de premium analytics; sin pagos automatizados en MVP.          | WONT de pagos.     |
| DEC-051 | Tratamiento del API EA | Proveedor no garantizado: caché, retries, circuit breaker, storage propio y revisión manual. | Riesgo #1 del PRD. |
| DEC-052 | Idiomas UI             | `es` default, `en` soportado. Independiente de datos EA.                                     | Producto bilingüe. |

## 7. Acceso personal del jugador

| ID      | Tema                            | Resolución vigente                                                                                                                                                                                                                                                              |
| ------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-070 | Jugador sin organización        | Un jugador puede registrarse, crear un perfil personal y usar la plataforma sin invitación ni membresía de organización.                                                                                                                                                        |
| DEC-071 | Invitación de jugador           | La invitación es opcional y nace en una competición. Al aceptarla se añade acceso contextual a esa competición y la membresía mínima de organización requerida por tenancy; no se crea una participación en plantilla. El perfil personal y su historial se conservan.          |
| DEC-076 | Nombre de organización          | El nombre es obligatorio y único globalmente tras normalizar Unicode, espacios y mayúsculas. La UI consulta disponibilidad antes de avanzar y Postgres garantiza la unicidad para resolver carreras.                                                                            |
| DEC-072 | Fuente de la vista personal     | Partidos y estadísticas individuales solo se proyectan desde resultados oficiales aprobados; candidatos, disputas y payloads EA raw no se muestran.                                                                                                                             |
| DEC-073 | Identidad de juego declarada    | El jugador registra un identificador de EA, plataforma y edición sin entregar credenciales. Futrob confía en la declaración y no verifica propiedad. El identificador se usa para correlacionar partidos y estadísticas; plataforma y edición son contexto técnico de consulta. |
| DEC-074 | Privacidad de la vista personal | El jugador puede ver sus propios datos y metadata sanitizada de contexto; no obtiene acceso general a datos privados de organizaciones donde no es miembro.                                                                                                                     |
| DEC-075 | Estado de onboarding            | `identity` persiste en `actor_onboarding`, por `ActorId`, finalización, fecha, versión y camino. El registro va directo al onboarding; el login consulta este estado antes que las membresías.                                                                                  |
| DEC-077 | Un equipo por competición       | Un `PlayerProfile` puede integrar como máximo un Team por Competition (`UNIQUE(player_profile_id, competition_id)` en la plantilla). Varios equipos solo entre competiciones distintas. La membresía de competición no sustituye la plantilla.                                  |
| DEC-078 | Equipo activo personal          | `ActiveTeamPreference` guarda un único `roster_membership_id` por actor. Es preferencia de UI/contexto personal, no elegibilidad competitiva. Puede apuntar a cualquier membresía de plantilla del actor; reemplazarla es idempotente.                                          |
| DEC-079 | Plantilla y cuenta de juego     | Una membresía de plantilla puede amarrarse opcionalmente a un `PlayerGameAccount` del mismo perfil para fijar plataforma y edición al sincronizar. El mismo identificador EA en varias plataformas sigue siendo filas distintas de cuenta.                                      |
| DEC-080 | Asociación de club EA           | `ExternalClubConnection` conserva provider, club, edición y plataforma como asociación operativa del Team para localizar partidos. EA no ofrece una API de propiedad utilizable: Futrob no verifica, aprueba ni bloquea por propiedad del club.                                 |
| DEC-081 | Publicación de competición      | El draft se puede guardar y reanudar. Publicar exige reglas válidas y al menos dos participantes aprobados; la publicación bloquea identidad, formato, reglas y participantes. La materialización de Stage/Encounter/OfficialMatch permanece en Fase 2.                         |

## 8. Decisiones que no deben reintroducirse sin ADR + cambio de producto

- OCR como camino feliz de oficialización.
- Evidence Inbox como superficie primaria de resultados.
- Match/Series/Game del modelo anterior sin mapear a Encounter/OfficialMatch/EaMatch.
- Kapso/WhatsApp/Telegram como requisitos Must del MVP.
- Entrants 1v1/pair/squad como supuesto universal del dominio Clubs.
- Verificación o aprobación de propiedad de cuenta/club EA.

## 9. Decisiones resueltas de sistema de diseño

| ID      | Tema                  | Resolución vigente                                                                                                                      |
| ------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-060 | Tema predeterminado   | Light en marketing, producto y portal. Dark solo puede activarse de forma explícita; no sigue automáticamente al sistema operativo.     |
| DEC-061 | Tamaño de controles   | 44 px universal. La única compactación es `dense`: 36 px en desktop operativo y 44 px en touch.                                         |
| DEC-062 | Lenguaje visual       | Flat/line: jerarquía por espacio, tipografía y bordes; sombras ambientales solo en capas flotantes.                                     |
| DEC-063 | Semántica del verde   | Verde para marca/acción primaria. `approved` usa un verde distinto y exclusivo para resultados oficialmente aprobados.                  |
| DEC-064 | Tipografía de labels  | `typo-label` es el default; metadata secundaria puede usar sentence-case cuando uppercase reduzca legibilidad.                          |
| DEC-065 | CTA de marketing      | `ButtonIcon` es un recurso distintivo de CTA de marketing y no se usa en tablas, toolbars ni formularios operativos.                    |
| DEC-066 | Variantes             | Las primitivas tienen variantes cerradas. Las pantallas no crean variantes visuales ad hoc mediante `className`.                        |
| DEC-067 | Prioridad de catálogo | Formularios completos, navegación, data tables/rows y overlays son el núcleo. Storybook es la referencia ejecutable y de accesibilidad. |
