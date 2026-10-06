# Futrob MVP — Decisiones abiertas y defaults

**Regla de uso:** ninguna decisión de este documento bloquea el setup fundacional. Hasta que producto la cambie explícitamente, se aplica el default recomendado y se versiona cuando afecte resultados históricos.

**Precedencia:** solicitud vigente del usuario > [prd.md](/product/prd.md) > defaults de este documento.

## 1. Decisiones resueltas por el PRD vigente

| ID      | Tema                          | Resolución vigente                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 | Fuente primaria de resultados | Datos de EA Clubs (`proclubs.ea.com/api`) + selección/confirmación humana. OCR/capturas no son fuente primaria del MVP.                                                                                                                                                                                                                                                                                                                                                       |
| DEC-002 | Modalidad piloto              | FC Clubs. Otras modalidades son extensión.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| DEC-003 | Notificaciones MVP            | Web + correo. WhatsApp y push son ampliaciones.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| DEC-004 | Unidad competitiva            | Team (club/equipo) en fixtures, tabla y bracket.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| DEC-005 | Jerarquía                     | `Encounter → OfficialMatch` con `Series` como regla de resolución; `ProviderMatch` es dato externo.                                                                                                                                                                                                                                                                                                                                                                           |
| DEC-006 | Stack de plataforma           | Web TanStack Start y auth Better Auth en **Cloudflare Workers**; API de producto Hono/Node en **Railway** con **Postgres** y egress EA. Auth, actores y rate limits BFF en ese mismo Postgres vía Hyperdrive ([ADR-0021](/docs/adr/0021-auth-and-actors-in-product-postgres.md)); R2, Queues y Cron en web. Dominio/application en `packages/<bc>`, composición de producto en `apps/api/src/di`. Ver [arquitectura](/docs/architecture/overview.md). Sin Supabase ni Vercel. |
| DEC-007 | Cliente móvil MVP             | React Native + Expo es una superficie Must del MVP. Consume `/api/v1` con `@futrob/sdk` (TypeScript), usa Better Auth Bearer + SecureStore y cubre los flujos autenticados aplicables al rol. No Flutter ni SDK Dart; landing y portal público permanecen web responsive.                                                                                                                                                                                                     |

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

| ID      | Decisión pendiente                  | Default recomendado                                                                                                                                                                                                            | Motivo                                                                                                                                      |
| ------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-020 | Quién inicia la selección           | Cualquiera de los dos capitanes (o subcapitán autorizado).                                                                                                                                                                     | Evita deadlock si el “local” no actúa.                                                                                                      |
| DEC-021 | Tiempo máximo de confirmación rival | **Validada el 2026-10-05 ([§3.1](#31-dec-021--vencimiento-de-la-confirmación-rival)).** 24 horas desde la propuesta, sin depender del inicio programado. Al vencer pasa a revisión del organizador. El silencio nunca aprueba. | El default anterior («o hasta el inicio programado si ocurre antes») hace nacer vencida toda propuesta, porque se propone después de jugar. |
| DEC-022 | Auto-aprobación                     | Si ambos capitanes confirman la misma selección y no hay flags de integridad, auto-aprobar.                                                                                                                                    | Reduce carga del organizador.                                                                                                               |
| DEC-023 | Ventana temporal de candidatos      | ±6 horas alrededor de cada OfficialMatch programado, configurable por competición (1–24 h).                                                                                                                                    | Cubre jornadas densas sin mezclar días enteros por defecto.                                                                                 |
| DEC-024 | Candidatos previos tras reprogramar | Se conservan; se recalcula elegibilidad/ventana con el nuevo horario.                                                                                                                                                          | No perder evidencia de sync.                                                                                                                |
| DEC-025 | Partidos no seleccionados           | Permanecen para analíticas privadas/contexto; no afectan competición.                                                                                                                                                          | Separación oficial vs contextual.                                                                                                           |
| DEC-026 | Unicidad de referencias externas    | Una referencia `(providerKey, externalId)` pertenece a una sola selección en todo el sistema, entre organizaciones; se libera al devolver el caso a selección o anular.                                                        | Un partido del proveedor no debe contar en dos competiciones. Decidido en implementación; pendiente de validación de producto.              |
| DEC-027 | Flags de integridad bloqueantes     | `provider_data_incomplete` y `provider_match_disconnected` envían el acuerdo a revisión del organizador; elegibilidad y unicidad no son flags ni se pueden omitir.                                                             | Concreta DEC-022. Decidido en implementación; pendiente de validación de producto.                                                          |

### 3.1 DEC-021 — Vencimiento de la confirmación rival

| Estado                | Contenido                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Propuesta**         | Dos alternativas: **A**, 24 horas desde la propuesta; **B**, un límite competitivo explícito por Encounter.                                                |
| **Recomendación**     | **A** para el MVP. B queda como extensión cuando competitions modele un cierre de resultados.                                                              |
| **Decisión validada** | **A**, con la regla común de esta sección. Validada por el responsable de producto el 2026-10-05 en [#129](https://github.com/thedavos/futrob/issues/129). |
| **Runtime**           | Implementado en el checkout de [#130](https://github.com/thedavos/futrob/issues/130), sin despliegue; verifica los vectores de la columna A.               |

El runtime de #130 aplica el plazo por reloj aunque el runner esté retrasado. Sin respuesta, el runner
traslada la propuesta vencida a `organizer_review`; nunca se aprueba por silencio.

**Por qué no sirve el default anterior.** «24 horas o hasta el inicio programado si ocurre antes» compara con
el kickoff, pero la selección elige partidos ya jugados. Con kickoff 2026-10-03T18:00Z y propuesta
2026-10-03T20:00Z, el límite sería 18:00Z: la propuesta nacería vencida. El kickoff no es ancla en ninguna
alternativa.

#### Alternativas

| Aspecto                        | A: 24 h desde la propuesta (validada)                             | B: límite competitivo explícito `L`                                                       |
| ------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Ancla                          | `createdAt` de la propuesta, del reloj de la API.                 | Instante `L` configurado para el Encounter (cierre de resultados).                        |
| Duración                       | 24 horas exactas (86 400 000 ms), sin calendario ni zona horaria. | Ninguna: el plazo termina en `L`, cualquiera sea `createdAt`.                             |
| Deadline `D`                   | `createdAt + 24 h`, guardado en UTC al crear la propuesta.        | `L`, guardado en UTC al crear la propuesta.                                               |
| Propuesta posterior al kickoff | Recibe sus 24 h completas.                                        | Recibe lo que quede hasta `L`; si se crea en o después de `L`, nace vencida.              |
| Nueva propuesta (ronda nueva)  | Recibe un `D` propio de 24 h.                                     | Comparte el mismo `L`; si ya pasó, nace vencida salvo que el organizador mueva `L`.       |
| Quién fija el plazo            | La regla de producto validada.                                    | El organizador por Encounter o jornada. Requiere modelo y permiso nuevos en competitions. |
| Coste                          | Un campo por propuesta y un vencimiento.                          | Además, configuración, interfaz, reglas al reprogramar (DEC-024, DEC-034) y propagación.  |

Una variante C, `D = min(createdAt + 24 h, L)`, equivale a A cuando no hay `L` y a B cuando `L` es anterior.
Permite adoptar A ahora y añadir `L` después sin alargar plazos ya concedidos.

#### Regla común (ambas alternativas)

- **Comparación.** Una respuesta del Team rival en el instante `t` está a tiempo si `t < D`. En `t = D` o
  después está fuera de plazo. `t` es el reloj de la API (`ClockPort`) al evaluar el comando, con precisión
  de milisegundo. No cuentan la hora del cliente, del BFF ni del runner.
- **Respuestas afectadas.** Confirmar, alternativa equivalente, rechazar, alternativa incompatible y abrir
  disputa sobre esa propuesta. Fuera de plazo todas fallan con el error estable
  `results.confirmation_window_closed`, sin cambio de estado, sin `OfficialResult` y sin contribución a
  estadísticas. La guardia rige aunque el vencimiento aún no se haya procesado.
- **Confirmación tardía y alternativa equivalente.** Siguen exactamente la misma frontera. Una alternativa
  equivalente en `t < D` aprueba como una confirmación; en `t ≥ D` falla igual.
- **Vencimiento.** Al procesar una propuesta en `awaiting_opponent_confirmation` con reloj `≥ D`, la
  selección pasa a `organizer_review` con una sola acción de auditoría `confirmation_expired`
  (capacidad `system`, deadline y reloj de procesamiento). No se crea un estado nuevo: se reutilizan los
  comandos de revisión.
- **Efectos del vencimiento.** Ninguno oficial: cero `OfficialResult`, cero proyección, ningún
  `results.official-result-approved`. La propuesta inmutable y sus reservas de referencias se conservan.
  No implica sanción, walkover ni notificación; esas reglas son otras.
- **Silencio.** Nunca aprueba ni oficializa. El vencimiento solo traslada el caso al organizador.
- **Flags de integridad (DEC-022, DEC-027).** El vencimiento no es un flag ni los evalúa. Una confirmación a
  tiempo con flag bloqueante va a `organizer_review` como hoy. Si el organizador aprueba una propuesta
  vencida, se aplica `operator_resolution` y debe reconocer los flags presentes.
- **Reapertura y nueva propuesta.** Los Teams no reabren un caso vencido. El organizador resuelve: aprueba
  la propuesta vencida con motivo, o la devuelve a selección (ronda +1). Una propuesta nueva obtiene su
  propio `D` según la alternativa validada. Proponer sobre una selección anulada (`voided`) sigue igual.
- **Separada de DEC-032.** El TTL de reprogramación pertenece a scheduling, dura 12 horas y escala a
  `escalated`. DEC-021 pertenece a results y no comparte constante, configuración, job ni estado con
  DEC-032. Un reglamento que cambie DEC-032 no cambia DEC-021.
- **Autoridad.** El responsable de producto valida la regla. En runtime, `@futrob/results` evalúa el plazo
  con el reloj de la API; el runner solo materializa el vencimiento. En B, fijar `L` requiere además
  un permiso de organizador que todavía no existe.

En #130 se exige `RESULTS_SYSTEM_ACTOR_ID` ya provisionado por identity. El tratamiento legacy fue
validado explícitamente el 2026-10-05 durante esa implementación: conservar filas inmutables y guardar
el deadline original `createdAt + 24 h` en una tabla temporal separada. Si ya pasó, el runner las envía
a `organizer_review`, sin plazo nuevo ni aprobación por silencio.

#### Vectores de aceptación

Contexto común: kickoff `K = 2026-10-03T18:00:00.000Z`. El Team A propone `P1` en
`P = 2026-10-03T20:00:00.000Z`, ronda 1, sin flags salvo que se indique. El Team B responde en el instante
de la columna.

- **A:** `D = 2026-10-04T20:00:00.000Z`.
- **B-L1:** límite anterior a `P + 24 h`, `D = L1 = 2026-10-04T12:00:00.000Z`.
- **B-L2:** límite posterior a `P + 24 h`, `D = L2 = 2026-10-05T12:00:00.000Z`.

Salidas:

- **Aprueba:** `approved`, `OfficialResult` revisión 1 con base `team_agreement` y contribución a estadísticas.
- **Cerrada:** falla fuera de plazo, sin cambio de estado, sin resultado y sin contribución.
- **Revisión por flag:** `organizer_review`, sin resultado.
- **Vence:** `organizer_review`, una acción `confirmation_expired` y cero `OfficialResult`.
- **Pendiente:** sigue en `awaiting_opponent_confirmation` y no se registra ninguna acción.

| ID     | Respuesta de B                                                       | Instante (UTC)             | A (validada)                 | B-L1                         | B-L2                             |
| ------ | -------------------------------------------------------------------- | -------------------------- | ---------------------------- | ---------------------------- | -------------------------------- |
| V21-01 | Confirma                                                             | `2026-10-04T11:59:59.999Z` | Aprueba                      | Aprueba                      | Aprueba                          |
| V21-02 | Confirma                                                             | `2026-10-04T12:00:00.000Z` | Aprueba                      | Cerrada                      | Aprueba                          |
| V21-03 | Confirma                                                             | `2026-10-04T19:59:59.999Z` | Aprueba                      | Cerrada                      | Aprueba                          |
| V21-04 | Confirma                                                             | `2026-10-04T20:00:00.000Z` | Cerrada                      | Cerrada                      | Aprueba                          |
| V21-05 | Confirma                                                             | `2026-10-04T20:00:00.001Z` | Cerrada                      | Cerrada                      | Aprueba                          |
| V21-06 | Alternativa equivalente                                              | `2026-10-04T19:59:59.999Z` | Aprueba                      | Cerrada                      | Aprueba                          |
| V21-07 | Alternativa equivalente                                              | `2026-10-04T20:00:00.000Z` | Cerrada                      | Cerrada                      | Aprueba                          |
| V21-08 | Confirma con `provider_data_incomplete`                              | `2026-10-04T19:59:59.999Z` | Revisión por flag            | Cerrada                      | Revisión por flag                |
| V21-09 | Rechaza con motivo                                                   | `2026-10-04T20:00:00.000Z` | Cerrada                      | Cerrada                      | `disputed`                       |
| V21-10 | Silencio; vencimiento evaluado                                       | `2026-10-04T19:59:59.999Z` | Pendiente                    | Vence                        | Pendiente                        |
| V21-11 | Silencio; vencimiento evaluado                                       | `2026-10-04T20:00:00.000Z` | Vence                        | Vence                        | Pendiente                        |
| V21-12 | Confirma; vencimiento procesado después a `2026-10-05T03:00:00.000Z` | `2026-10-04T21:00:00.000Z` | Cerrada; luego vence una vez | Cerrada; luego vence una vez | Aprueba; el vencimiento no actúa |

Propuesta creada respecto del límite:

| ID     | Caso                                                            | A (validada)                                                  | B                                                                         |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| V21-13 | `P1` creada después del kickoff (`P > K`)                       | `D = 2026-10-04T20:00:00.000Z`; el kickoff no influye.        | `D = L`; el kickoff no influye.                                           |
| V21-14 | Límite anterior a la propuesta, `L0 = 2026-10-03T19:00:00.000Z` | No aplica.                                                    | `P1` nace vencida; confirmar en `2026-10-03T20:00:00.001Z` queda cerrada. |
| V21-15 | Default anterior `min(P + 24 h, K)`                             | Descartado: `D = 2026-10-03T18:00:00.000Z < P`, nace vencida. | Descartado.                                                               |

Nueva propuesta tras reapertura: el organizador devuelve el caso a selección en
`2026-10-05T10:00:00.000Z` y el Team A propone `P2` en `2026-10-05T11:00:00.000Z` (ronda 2).

| ID     | Respuesta de B a `P2` | Instante (UTC)             | A: `D = 2026-10-06T11:00:00.000Z` | B-L1: `D = L1`, ya pasado   | B-L2: `D = L2 = 2026-10-05T12:00:00.000Z` |
| ------ | --------------------- | -------------------------- | --------------------------------- | --------------------------- | ----------------------------------------- |
| V21-16 | Confirma              | `2026-10-05T11:59:59.999Z` | Aprueba (ronda 2)                 | Cerrada; `P2` nació vencida | Aprueba (ronda 2)                         |
| V21-17 | Confirma              | `2026-10-05T12:00:00.000Z` | Aprueba (ronda 2)                 | Cerrada                     | Cerrada                                   |
| V21-18 | Confirma              | `2026-10-06T10:59:59.999Z` | Aprueba (ronda 2)                 | Cerrada                     | Cerrada                                   |
| V21-19 | Confirma              | `2026-10-06T11:00:00.000Z` | Cerrada                           | Cerrada                     | Cerrada                                   |

En todas las filas `P1` deja de ser aprobable por los Teams al abrirse la ronda 2. Cada fila es un
escenario independiente; reevaluar el vencimiento de una selección ya vencida no añade acciones.

Estos vectores son el contrato de las pruebas de #130 con la alternativa que se valide. Las pruebas
ejercitan los casos de uso y el runner con reloj y fechas literales; no comparan constantes ni este
documento.

## 4. Reprogramación

| ID      | Decisión pendiente               | Default recomendado                                                                      | Motivo                     |
| ------- | -------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------- |
| DEC-030 | Máximo de reprogramaciones       | 2 por Team por Encounter, configurable.                                                  | Evita abuso sin rigidizar. |
| DEC-031 | Quién puede iniciar              | Capitán, subcapitán con permiso, organizador/staff.                                      | Alineado al PRD.           |
| DEC-032 | Expiración de propuesta          | 12 horas o según reglamento de competición.                                              | Fuerza resolución.         |
| DEC-033 | Escalada                         | Si expira sin acuerdo, estado `escalated` y el organizador puede fijar fecha o walkover. | Cierre operativo.          |
| DEC-034 | Fecha límite de reprogramaciones | Configurable; tras ella solo organizador/staff.                                          | Control de calendario.     |

## 5. Datos EA y estadísticas

| ID      | Decisión pendiente                | Default recomendado                                                                                                                                                                 | Motivo                               |
| ------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| DEC-040 | Estadísticas confiables iniciales | Marcador, duración, goles, asistencias, rating, MVP, tiros, pases y entradas cuando el payload las traiga; campos ausentes = null tipado, no cero inventado.                        | Evita falsos ceros.                  |
| DEC-041 | Ranking de rendimiento de equipos | Fórmula v1 versionada 0–100 basada en resultados, DG, forma reciente y eficiencia ofensiva/defensiva disponibles. Pesos: [team-performance-v1.md](/product/team-performance-v1.md). | Transparente y estable en temporada. |
| DEC-042 | Premios individuales              | Rankings de goles, asistencias, rating, MVP y portero; mínimos de elegibilidad configurables.                                                                                       | Cobertura esencial.                  |
| DEC-043 | Elegibilidad default              | Mínimo 3 partidos o 60 % de minutos del Team en la etapa, lo que el organizador configure.                                                                                          | Reduce rankings engañosos.           |
| DEC-044 | Analíticas públicas vs premium    | Públicos: tabla, resultados, rankings esenciales. Premium: percentiles, evolución, comparativas y analítica de organizador.                                                         | Soporta FR-17.                       |

## 6. Comercial e integraciones

| ID      | Decisión pendiente     | Default recomendado                                                                          | Motivo             |
| ------- | ---------------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| DEC-050 | Planes comerciales MVP | Un plan free operativo + flag de premium analytics; sin pagos automatizados en MVP.          | WONT de pagos.     |
| DEC-051 | Tratamiento del API EA | Proveedor no garantizado: caché, retries, circuit breaker, storage propio y revisión manual. | Riesgo #1 del PRD. |
| DEC-052 | Idiomas UI             | `es` default, `en` soportado. Independiente de datos EA.                                     | Producto bilingüe. |

## 7. Acceso personal del jugador

| ID      | Tema                            | Resolución vigente                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-070 | Jugador sin organización        | Un jugador puede registrarse, crear un perfil personal y usar la plataforma sin invitación ni membresía de organización.                                                                                                                                                                                                                                                                                                                                                          |
| DEC-071 | Invitación de jugador           | La invitación es opcional y nace en una competición. Al aceptarla se añade acceso contextual a esa competición y la membresía mínima de organización requerida por tenancy; no se crea una participación en plantilla. El perfil personal y su historial se conservan.                                                                                                                                                                                                            |
| DEC-076 | Nombre de organización          | El nombre es obligatorio y único globalmente tras normalizar Unicode, espacios y mayúsculas. La UI consulta disponibilidad antes de avanzar y Postgres garantiza la unicidad para resolver carreras.                                                                                                                                                                                                                                                                              |
| DEC-072 | Fuente de la vista personal     | Partidos y estadísticas individuales solo se proyectan desde resultados oficiales aprobados; candidatos, disputas y payloads EA raw no se muestran.                                                                                                                                                                                                                                                                                                                               |
| DEC-073 | Identidad de juego declarada    | El jugador registra un identificador de EA, plataforma y edición sin entregar credenciales. Futrob confía en la declaración y no verifica propiedad. El identificador se usa para correlacionar partidos y estadísticas; plataforma y edición son contexto técnico de consulta.                                                                                                                                                                                                   |
| DEC-074 | Privacidad de la vista personal | El jugador puede ver sus propios datos y metadata sanitizada de contexto; no obtiene acceso general a datos privados de organizaciones donde no es miembro.                                                                                                                                                                                                                                                                                                                       |
| DEC-075 | Estado de onboarding            | `identity` persiste en `actor_onboarding`, por `ActorId`, finalización, fecha, versión y camino. El registro va directo al onboarding; el login consulta este estado antes que las membresías.                                                                                                                                                                                                                                                                                    |
| DEC-077 | Un equipo por competición       | Un `PlayerProfile` puede integrar como máximo un Team por Competition (`UNIQUE(player_profile_id, competition_id)` en la plantilla). Varios equipos solo entre competiciones distintas. La membresía de competición no sustituye la plantilla.                                                                                                                                                                                                                                    |
| DEC-078 | Equipo activo personal          | `ActiveTeamPreference` guarda un único `roster_membership_id` por actor. Es preferencia de UI/contexto personal, no elegibilidad competitiva. Puede apuntar a cualquier membresía de plantilla del actor; reemplazarla es idempotente.                                                                                                                                                                                                                                            |
| DEC-079 | Plantilla y cuenta de juego     | Una membresía de plantilla puede amarrarse opcionalmente a un `PlayerGameAccount` del mismo perfil para fijar plataforma y edición al sincronizar. El mismo identificador EA en varias plataformas sigue siendo filas distintas de cuenta.                                                                                                                                                                                                                                        |
| DEC-080 | Asociación de club EA           | `ExternalClubConnection` conserva provider, club, edición y plataforma como asociación operativa del Team para localizar partidos. EA no ofrece una API de propiedad utilizable: Futrob no verifica, aprueba ni bloquea por propiedad del club.                                                                                                                                                                                                                                   |
| DEC-081 | Publicación de competición      | El draft se puede guardar y reanudar. Publicar exige reglas válidas y al menos dos participantes aprobados; la publicación bloquea identidad, formato, reglas y participantes. La materialización de Stage/Encounter/OfficialMatch permanece en Fase 2.                                                                                                                                                                                                                           |
| DEC-082 | Slug de organización            | El slug es obligatorio, único globalmente y tiene la forma `^[a-z0-9]+(-[a-z0-9]+)*$` de 3 a 48 caracteres, sin palabras reservadas (`new`, `admin`, `api`, `media`, `orgs`, `player`, `login`, `signup`, `futrob`…). Se sugiere desde el nombre y es editable en ajustes con `organizations.update`. La UI y el caso de uso comprueban la disponibilidad antes de guardar y Postgres garantiza la unicidad. No hay historial ni redirecciones mientras no exista portal público. |
| DEC-083 | Escudo de organización          | Sin escudo propio se muestra un monograma generado del nombre; no hay ilustraciones predefinidas. El escudo propio es una imagen PNG, JPEG o WebP de hasta 2 MB guardada en R2 bajo `organization-logos/{organizationId}/` con el mismo mecanismo de portadas de competición (ADR-0020).                                                                                                                                                                                          |
| DEC-084 | Zona horaria de organización    | La zona IANA es obligatoria; por defecto, la del navegador. Es el valor inicial de las competiciones nuevas de la organización y no modifica las existentes. Las organizaciones previas reciben la zona de su competición más antigua, o `UTC` si no tienen.                                                                                                                                                                                                                      |
| DEC-085 | Perfil en onboarding y diálogo  | El onboarding no añade pasos: la API deriva el slug del nombre y toma la zona horaria de la competición creada en el mismo paso; el escudo queda en monograma. El diálogo del selector solo pide el nombre y aplica los valores por defecto. El resto se edita en ajustes.                                                                                                                                                                                                        |
| DEC-086 | Destino tras crear organización | Desde `/orgs/new` se abre `/orgs/$orgId/competitions`, cuyo estado vacío ofrece crear la primera competición. El diálogo del selector conserva su destino.                                                                                                                                                                                                                                                                                                                        |
| DEC-087 | Nombre editable                 | El nombre de la organización se puede editar en ajustes con la misma regla de unicidad que al crear (DEC-076).                                                                                                                                                                                                                                                                                                                                                                    |

## 8. Decisiones que no deben reintroducirse sin ADR + cambio de producto

- OCR como camino feliz de oficialización.
- Evidence Inbox como superficie primaria de resultados.
- Match/Series/Game del modelo anterior sin mapear a Encounter/OfficialMatch/ProviderMatch.
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
