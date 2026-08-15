# Futrob — Documento maestro de producto y PRD del MVP

**Estado:** canónico  
**Fecha:** 2026-07-17  
**Precedencia:** la solicitud vigente del usuario prevalece sobre este documento cuando exista conflicto.

Futrob es una plataforma especializada en crear, operar y seguir ligas, copas y torneos de EA SPORTS FC. Su primer enfoque es **FC Clubs**, utilizando los datos de `proclubs.ea.com/api` para identificar partidos, registrar resultados oficiales, almacenar estadísticas y generar rankings y analíticas.

## 1. Resumen ejecutivo

Futrob resuelve la operación completa de una competición de EA SPORTS FC: creación, inscripción, gestión de equipos y plantillas, calendarización, reprogramaciones, selección de partidos oficiales, confirmación de resultados, estadísticas, rankings, sanciones y publicación de información para espectadores.

La plataforma debe distinguir claramente entre:

| Concepto                              | Definición                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Enfrentamiento** (`Encounter`)      | Cita competitiva programada entre dos participantes.                                                                   |
| **Partido oficial** (`OfficialMatch`) | Uno de los partidos que cuenta para el enfrentamiento.                                                                 |
| **Partido EA** (`EaMatch`)            | Registro obtenido desde el API de EA, sea oficial o amistoso.                                                          |
| **Serie** (`Series`)                  | Conjunto de uno o más partidos oficiales cuyo resultado puede resolverse individualmente o mediante marcador agregado. |

Una jornada puede programar un enfrentamiento con uno o dos partidos oficiales. Los mismos rivales podrían jugar cinco veces durante ese día; Futrob mostrará los cinco partidos obtenidos desde EA y permitirá que los capitanes seleccionen cuáles cuentan para la competición.

## 2. Visión

> Convertir a Futrob en el sistema operativo de las competiciones de EA SPORTS FC: una plataforma donde organizadores, clubes, capitanes, jugadores y espectadores puedan participar en torneos confiables, automatizados y basados en datos.

### Propuesta de valor

- Especialización en EA SPORTS FC.
- Gestión completa de ligas, copas y torneos.
- Resultados y estadísticas obtenidos desde EA Clubs.
- Selección auditable de partidos oficiales.
- Soporte para enfrentamientos de uno o varios partidos.
- Reprogramación controlada de encuentros y partidos.
- Rankings de jugadores y equipos.
- Analíticas premium para equipos, jugadores y organizadores.
- Portal público atractivo para seguidores y espectadores.

## 3. Usuarios y roles

Los roles son contextuales. Un usuario puede ser organizador en una organización, capitán en una competición y espectador en otra. El perfil de jugador puede existir sin pertenecer a una organización; una invitación de competición concede acceso a esa competición, no es un requisito para registrarse ni para consultar los datos personales.

| Rol                      | Responsabilidad principal                                                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Superusuario**         | Administra plataforma, ediciones, suscripciones, integraciones, moderación y auditoría.                                                                                                            |
| **Organizador**          | Crea y opera competiciones, aprueba inscripciones, reprograma, revisa disputas y configura publicación.                                                                                            |
| **Staff de competición** | Permisos granulares: fixtures, resultados, disputas, inscripciones, anuncios, sanciones.                                                                                                           |
| **Capitán**              | Representa al equipo: club EA, plantilla, reprogramaciones, selección oficial y confirmación.                                                                                                      |
| **Subcapitán**           | Permisos delegados del capitán.                                                                                                                                                                    |
| **Jugador**              | Mantiene un perfil personal, consulta sus partidos y estadísticas individuales y, cuando corresponde, participa en plantillas, fixtures y analíticas. Puede existir sin membresía de organización. |
| **Espectador**           | Solo información pública; sin disputas, evidencias privadas ni datos administrativos.                                                                                                              |

### Espacio personal del jugador

Un jugador autenticado puede crear o mantener su perfil personal sin crear una organización ni aceptar una invitación. Desde ese espacio puede registrar su identificador de EA, consultar Mis partidos y visualizar Mis estadísticas. Futrob confía en el identificador declarado y no verifica que el actor sea propietario de la cuenta.

Mis partidos es una sola fuente de `ProviderMatch` de los clubes asociados, con pestañas Recientes (últimos 7 días de calendario) y Todos (cupo del proveedor). Recientes y Todos marcan si cada partido es de liga, playoff o amistoso, y las tarjetas de la aparición. Un hat-trick, póker o repóker se marca cuando la aparición tiene 3, 4 o 5+ goles. El historial oficial de contribuciones vive en Mis estadísticas. Las proyecciones competitivas no nacen de observaciones de proveedor.

El jugador también puede asociar uno o más `ExternalClub` a su `PlayerProfile`. Cada
`PlayerExternalClubAssociation` es opcional y declarativa para el perfil: no crea una organización, un `Team`, una entrada de competición ni una membresía de `Roster`, ni prueba propiedad del club. Sí es obligatoria para consultar partidos recientes: sin al menos un club asociado no se llama al proveedor. El identificador de juego solo filtra apariciones después de traer los partidos de esos clubes. La asociación operativa
`ExternalClubConnection` pertenece a un `Team` de competición y es un concepto distinto.

El onboarding asegura este perfil personal en los caminos jugador, invitación y organizador. La
cuenta EA es opcional en los tres. El camino organizador crea además una primera competición en
estado `draft`; plataforma y edición de esa competición permanecen separadas de las declaradas en
la cuenta personal.

La invitación de competición emitida por un organizador o staff es opcional. Al aceptarla, el actor obtiene una membresía mínima de la organización para respetar el aislamiento del tenant y una membresía contextual en la competición —por ejemplo, jugador o capitán—. Esta membresía no lo incorpora por sí sola a la plantilla de un equipo ni le concede elegibilidad competitiva. Tampoco reemplaza ni elimina el perfil personal. El espacio personal nunca expone disputas, payloads EA crudos, tokens ni datos administrativos privados de una organización.

Antes de entrar al espacio personal, el actor debe completar el onboarding. Futrob persiste este
estado de producto —incluyendo fecha, versión y camino elegido— de forma separada a la sesión de
Better Auth. Un jugador que ya lo completó y no tiene membresías vuelve directamente a su espacio
personal en accesos posteriores.

El registro y el login tienen secuencias distintas. Un registro exitoso entra directamente al
onboarding porque crea un actor nuevo. Un login consulta primero `actor_onboarding`; únicamente
cuando está completo consulta las membresías para resolver el destino autenticado.

## 4. Edición y modalidad

Futrob modela la edición del juego como entidad configurable (`FC 25`, `FC 26`, `FC 27`, futuras). El MVP se enfoca en **FC Clubs**. La arquitectura debe permitir incorporar después FC Temporadas, FC Amistosos y torneos individuales o por parejas.

Cada competición queda vinculada a una edición y modalidad desde su creación. Esos valores no deben cambiar después de iniciar la competición.

El setup se guarda como borrador reanudable en cinco pasos: información, formato, reglas, participantes y revisión. Publicar requiere reglas coherentes con el formato y al menos dos participantes aprobados; después bloquea la estructura. La asociación de un Team con un club EA es declarativa y operativa para localizar partidos: no existe verificación de cuenta o propiedad mediante EA.

## 5. Formatos

### MVP

- Liga todos contra todos.
- Eliminación directa.
- Fase de grupos y eliminación.
- Liga con playoffs.

### Posteriores

- Doble eliminación, sistema suizo, divisiones con ascenso/descenso, Apertura/Clausura, series al mejor de tres o cinco.

## 6–11. Modelo competitivo, EA, selección, reprogramación y resultados

Ver detalle operativo en [mvp-requirements.md](/product/mvp-requirements.md) y vocabulario en [domain-glossary.md](/product/domain-glossary.md). Resumen:

1. Organización → Competición → Etapa → Jornada/Ronda → Enfrentamiento → Partido(s) oficial(es).
2. Cada competición define 1 o 2 partidos oficiales por enfrentamiento y el modo de resolución (independientes o marcador agregado).
3. Futrob sincroniza partidos desde EA, los guarda como candidatos y los capitanes seleccionan cuáles cuentan.
4. Reprogramación puede aplicar al enfrentamiento completo o a un partido oficial concreto.
5. Solo partidos oficiales aprobados actualizan tabla, bracket, rankings, estadísticas y portal público.

## 12–14. Estadísticas, rankings y analíticas premium

Estadísticas de equipo y jugador, tabla oficial, rankings por rol/métrica, ranking de rendimiento de equipos (0–100, fórmula versionada) y analíticas premium para equipo, jugador y organizador. Detalle en requisitos FR-13…FR-17.

## 15–16. Portal público y notificaciones

Cada competición puede publicar portada, reglamento, equipos, calendario, resultados, tabla, bracket, rankings y perfiles públicos. El MVP notifica por **web y correo**; WhatsApp y push quedan como ampliaciones.

## 17–18. Requisitos funcionales y no funcionales

Lista canónica en [mvp-requirements.md](/product/mvp-requirements.md) (`FR-01`…`FR-17` y NFR).

## 19. Modelo de datos conceptual

Incluye, entre otros: organizaciones, membresías, usuarios, actores, estado de onboarding del actor, perfiles personales de jugador, ediciones, cuentas de juego, competiciones, etapas, reglas, jornadas, equipos, plantillas, enfrentamientos, partidos oficiales, solicitudes de reprogramación, conexiones EA, jobs de sync, observaciones raw, partidos EA normalizados, candidatos, selecciones oficiales, disputas, sanciones, stats, rankings, analytics, salud del proveedor y auditoría. Lista completa en [mvp-requirements.md](/product/mvp-requirements.md#modelo-de-datos-conceptual).

## 20. Alcance del MVP

### Incluido

Aplicación web responsive; auth, perfiles personales de jugador y organizaciones/permisos; competiciones FC Clubs; ediciones configurables; formatos MVP; equipos y plantillas; fixtures y Match Center; 1–2 partidos oficiales; resultados individuales/agregados; reprogramación; vinculación y sync EA; selección/confirmación; disputas básicas; espacio personal con partidos y estadísticas individuales; tabla/bracket/stats/rankings esenciales; portal público; auditoría; primera capa de analíticas premium.

### Fuera del MVP

App nativa; FC Temporadas/Amistosos; marketplace; fantasy; streaming; white-label completo; doble eliminación y suizo; automatización de pagos/premios; predicciones con IA; OCR de capturas como fuente primaria de resultados; WhatsApp/Telegram como canal operativo del MVP.

## 21–23. Métricas, riesgos y roadmap

Ver [open-decisions.md](/product/open-decisions.md) y [mvp-requirements.md](/product/mvp-requirements.md). Fases: Fundamentos → Perfil personal y acceso → Operación → EA Data Layer → Resultados oficiales → Estadísticas/premium → Expansión.

## 24. Decisiones pendientes

Catalogadas con defaults en [open-decisions.md](/product/open-decisions.md).
