# Futrob MVP — Criterios de aceptación

**Uso:** cada escenario es verificable y referencia [mvp-requirements.md](/product/mvp-requirements.md). Salvo indicación contraria, los escenarios son **Must**. Los datos de prueba son ficticios.

## 1. Criterio de salida global

El MVP solo puede declararse completo si:

1. Todos los escenarios Must de este documento pasan en una instalación limpia.
2. Build, typecheck, lint, pruebas unitarias, integración, contratos y E2E relevantes pasan.
3. Las migraciones aplican desde una base vacía.
4. No hay hallazgos críticos/altos abiertos de autorización, aislamiento o integridad de datos EA.
5. No se han implementado capacidades Won't como si fueran parte del MVP.
6. Las capacidades Should omitidas se reportan explícitamente como parciales.

## 2. E2E canónico

### AC-E2E-001 — FC Clubs, sync EA, selección oficial y publicación

**Cubre:** FR-01…FR-16, FTR-DOM-001…002, FTR-EA-001…002, FTR-SEL-001…003, FTR-PUB-001.

- **Dado** un organizador autenticado y una base vacía migrada,
- **cuando** crea una organización y una competición FC Clubs publicada con dos equipos, clubes EA vinculados, plantillas, formato de liga o eliminación, fixture y un enfrentamiento con dos partidos oficiales,
- **y** Futrob sincroniza candidatos EA dentro de la ventana temporal, un capitán propone la selección, el rival confirma y el resultado queda aprobado,
- **entonces** existen Encounter, OfficialMatch y Series de resolución, los payloads EA originales permanecen privados, el resultado oficializa una sola vez, se actualizan estadísticas y standings o bracket, el portal público muestra el resultado y AuditLog conserva el recorrido.

Además, reejecutar el mismo job de sync o la misma confirmación no crea partidos, stats, notificaciones ni auditorías duplicadas.

## 3. Landing, shell y portal

### AC-WEB-001 — Landing pública

**Cubre:** FTR-WEB-001.

- **Dado** un visitante sin sesión,
- **cuando** abre la ruta pública principal en móvil y desktop,
- **entonces** entiende que Futrob opera competiciones EA SPORTS FC Clubs con datos de EA, y puede iniciar registro o acceso sin ver datos administrativos privados.

### AC-WEB-002 — Shell por permisos

**Cubre:** FTR-WEB-002, FTR-RBAC-002.

- **Dado** un organizador y un espectador,
- **cuando** ambos abren la misma competición,
- **entonces** el organizador ve acciones administrativas y el espectador solo la proyección pública; loading/vacío/error/éxito son distinguibles con teclado y lector de pantalla.

### AC-WEB-003 — Portal sanitizado

**Cubre:** FR-16, FTR-PUB-001.

- **Dado** una competición publicada con disputas internas y payloads EA,
- **cuando** un anónimo abre el portal,
- **entonces** ve tabla/resultados/bracket/rankings públicos y no ve disputas, tokens, payloads crudos ni identificadores internos de plataforma.

### AC-WEB-004 — Jugador sin organización

**Cubre:** FTR-PLAYER-001, FTR-PLAYER-004, FTR-WEB-002.

- **Dado** un usuario que acaba de completar el registro,
- **cuando** se crea correctamente su cuenta y sesión,
- **entonces** entra directamente al onboarding sin consultar membresías ni destinos anteriores.
- **Dado** un usuario existente que inicia sesión,
- **cuando** la autenticación termina correctamente,
- **entonces** la plataforma consulta primero su estado en `actor_onboarding`.
- **y** si está incompleto, entra al onboarding aunque tenga membresías.
- **y** solo si está completo, la plataforma consulta sus membresías y resuelve `/player`, una organización o el selector.
- **Dado** un actor en onboarding,
- **entonces** ve la opción “Continuar como jugador”.
- **cuando** elige esa opción, entra a su espacio personal de jugador sin crear una organización ni aceptar una invitación.
- **y** la plataforma persiste que completó el onboarding con fecha, versión y camino `player`.
- **y** en accesos posteriores sin membresías entra directamente a su espacio personal.
- **pero** si intenta abrir `/player` antes de completar el onboarding, no ve su contenido y es redirigido al onboarding.
- **y** puede aceptar una invitación o crear una organización posteriormente sin perder su perfil personal.

### AC-PLAYER-001 — Consulta personal de partidos y estadísticas

**Cubre:** FTR-PLAYER-002, FTR-PLAYER-003, FTR-PLAYER-005, FTR-PLAYER-006, FR-18.

- **Dado** un PlayerProfile con un identificador de EA registrado y partidos oficiales aprobados que contienen ese identificador externo,
- **cuando** abre Mis estadísticas,
- **entonces** ve únicamente agregados individuales construidos desde resultados oficiales aprobados, con estados de dato incompleto cuando corresponda.
- **y** no ve candidatos EA, disputas, payloads raw ni datos administrativos privados de organizaciones donde no sea miembro.
- **Dado** el mismo perfil,
- **cuando** abre Mis partidos,
- **entonces** ve dos bloques separados: Recientes (`ProviderMatch`) y Oficiales (contribuciones de resultados aprobados).
- **y** Oficiales lista solo contribuciones oficiales, con o sin club asociado.
- **Dado** un PlayerProfile sin `PlayerExternalClubAssociation`,
- **cuando** abre Recientes,
- **entonces** ve un empty state para asociar un club y Futrob no consulta al proveedor. El identificador de juego no alcanza para obtener recientes.
- **Dado** un PlayerProfile con al menos un club asociado y una cuenta de juego,
- **cuando** Recientes está listo,
- **entonces** ve apariciones en partidos de esos clubes filtradas por su identificador, sin mezclarlas con el historial oficial.

### AC-ONB-001 — Consecuencias multirrol del onboarding

**Cubre:** FTR-AUTH-003, FTR-PLAYER-001, FR-01, FR-02, FTR-COMP-001.

- **Dado** un actor que elige Invitación, **cuando** acepta un token válido emitido desde una
  competición, **entonces** obtiene acceso contextual a esa competición, la membresía mínima de
  organización y un PlayerProfile, con cuenta EA opcional.
- **y** aceptar la invitación no incorpora al actor a una plantilla ni le concede elegibilidad.
- **Dado** un actor que elige Organizar, **cuando** confirma organización, competición y cuenta
  opcional, **entonces** obtiene membresía `organizer`, PlayerProfile y una Competition `draft`
  scoped a esa organización.
- **y** reintentar la finalización no duplica organización, competición, perfil ni cuenta EA.
- **y** el organizador navega directamente al setup de la competición devuelta por la mutación.
- **pero** `identity` solo conserva camino, paso, versión y finalización; no almacena los borradores.

### AC-PLAYER-002 — Invitación posterior opcional

**Cubre:** FTR-PLAYER-004.

- **Dado** un jugador con espacio personal e historial propio,
- **cuando** acepta una invitación de competición,
- **entonces** se añade la membresía contextual de esa competición y la membresía mínima de organización, conserva el perfil personal y su historial, y obtiene solo los permisos de esas membresías.

## 4. Equipos y vinculación EA

### AC-TEAM-001 — Vincular club EA

**Cubre:** FR-04, FTR-TEAM-001.

- **Dado** un Team de la organización,
- **cuando** busca un club por nombre, selecciona el correcto y guarda,
- **entonces** Futrob persiste identificador, nombre, plataforma y edición como asociación operativa para localizar partidos, sin afirmar ni verificar propiedad y sin bloquear la aprobación.

### AC-COMP-002 — Reanudar y publicar configuración

**Cubre:** FTR-COMP-001, FR-02, FR-03.

- **Dado** un organizador o staff con una competición en borrador,
- **cuando** guarda identidad, formato, reglas y participantes y vuelve más tarde,
- **entonces** el wizard rehidrata el último draft persistido,
- **y cuando** existen reglas válidas y al menos dos participantes aprobados puede publicar,
- **y después de publicar** cualquier mutación estructural falla con `competitions.not_editable`.

## 5. Fixtures y modos de serie

### AC-FIX-001 — Enfrentamiento con dos partidos

**Cubre:** FR-05…FR-07, FTR-DOM-001…002.

- **Dado** una competición configurada con dos partidos oficiales y modo agregado,
- **cuando** se genera el fixture,
- **entonces** cada Encounter expone dos OfficialMatch y una Series con regla de marcador agregado; un Encounter de un partido usa Series de un solo OfficialMatch.

### AC-FIX-002 — Partidos independientes vs agregado

**Cubre:** FR-07.

- **Dado** dos OfficialMatch con resultados A 2-0 B y B 3-1 A,
- **cuando** el modo es independientes, cada partido puntúa por separado,
- **y cuando** el modo es agregado, el clasificado/ganador se decide por 3-4 a favor de B (salvo desempate configurado).

## 6. Reprogramación

### AC-SCH-001 — Reprogramar partido individual

**Cubre:** FR-08, FTR-SCH-001…003.

- **Dado** un Encounter con dos OfficialMatch pendientes,
- **cuando** un capitán propone reprogramar solo el partido 2 y el rival acepta,
- **entonces** solo ese OfficialMatch cambia de horario, el historial conserva la fecha anterior y la ventana de candidatos EA se recalcula.

### AC-SCH-002 — Bloqueo de estados finales

**Cubre:** FTR-SCH-002.

- **Dado** un OfficialMatch aprobado,
- **cuando** alguien intenta reprogramarlo,
- **entonces** la operación se rechaza con error tipado.

## 7. Sync EA y candidatos

### AC-EA-001 — Candidatos en ventana

**Cubre:** FR-09, FR-10, FTR-EA-001.

- **Dado** ambos clubes vinculados y un horario programado,
- **cuando** el sync encuentra cinco partidos EA entre esos clubes ese día,
- **entonces** el Match Center muestra los cinco como candidatos con hora, resultado, duración, local/visitante, jugadores y flags de datos incompletos, sin marcarlos como oficiales.

### AC-EA-002 — Idempotencia y payload original

**Cubre:** FR-12, FTR-EA-002, NFR-02…04.

- **Dado** un EaMatch ya observado,
- **cuando** el mismo sync se reejecuta,
- **entonces** no se duplica el partido canónico; el payload original permanece inmutable y puede existir una nueva observación versionada si el proveedor cambió datos.

## 8. Selección y confirmación

### AC-SEL-001 — Propuesta y confirmación rival

**Cubre:** FR-11, FTR-SEL-001…002.

- **Dado** candidatos disponibles para dos OfficialMatch,
- **cuando** el capitán A asigna candidatos a partido 1 y 2, ve la previsualización y propone,
- **y** el capitán B confirma la misma selección,
- **entonces** el Encounter puede pasar a aprobado automáticamente según reglas y alimentar stats oficiales.

### AC-SEL-002 — Desacuerdo y revisión

**Cubre:** FTR-SEL-001, FR-15.

- **Dado** una propuesta de A,
- **cuando** B propone otra selección incompatible,
- **entonces** el Encounter queda en disputa o revisión del organizador y no actualiza proyecciones públicas hasta resolución.

### AC-SEL-003 — Unicidad de eaMatchId

**Cubre:** FR-12, FTR-SEL-003.

- **Dado** un eaMatchId ya aprobado en un OfficialMatch,
- **cuando** se intenta usarlo en otro OfficialMatch,
- **entonces** la operación falla y queda auditada.

## 9. Rankings, analytics y notificaciones

### AC-RNK-001 — Tabla vs ranking de rendimiento

**Cubre:** FR-14, FTR-RNK-001.

- **Dado** resultados oficiales,
- **cuando** se recalculan proyecciones,
- **entonces** la tabla oficial y el ranking de rendimiento coexisten sin confundirse en UI ni en API.

### AC-ANA-001 — Premium protegido

**Cubre:** FR-17.

- **Dado** un espectador sin permiso premium,
- **cuando** solicita analíticas premium,
- **entonces** recibe denegación segura sin filtrar datos sensibles.

### AC-NTF-001 — Eventos clave

**Cubre:** FTR-NTF-001.

- **Dado** una selección propuesta o una reprogramación pendiente,
- **cuando** ocurre el evento,
- **entonces** se crea notificación web y se encola email sin duplicados ante reintentos.

## 10. Seguridad y aislamiento

### AC-SEC-001 — Aislamiento multi-tenant

**Cubre:** FTR-ORG-002, NFR-06.

- **Dado** dos organizaciones con IDs predecibles,
- **cuando** un actor de la org A intenta leer o mutar recursos de la org B,
- **entonces** falla sin revelar existencia del recurso.

### AC-SEC-002 — Replay sin efectos duplicados

**Cubre:** NFR-02.

- **Dado** un job de sync, una confirmación o un outbox event ya procesado,
- **cuando** se reentrega,
- **entonces** no hay efectos de negocio duplicados.
