# Futrob — Criterios de aceptación UX

**Propósito:** criterios verificables para diseño, implementación y QA del MVP Clubs/EA.  
**Convención:** IDs `UX-*` enlazables a historias o tests.

## 1. Alcance y coherencia

- **UX-SCP-001** Landing, web, app nativa y portal se identifican como Futrob y comparten tipografía, tokens y lenguaje visual; web y React Native mantienen render trees propios.
- **UX-SCP-002** La UI web y la app nativa React Native + Expo presentan ligas/copas EA SPORTS FC Clubs. No ofrecen fantasy, streaming propio, fútbol real ni OCR como camino feliz.
- **UX-SCP-003** La navegación base no cambia por formato; se ocultan destinos no aplicables (p. ej. bracket en liga pura).
- **UX-SCP-004** Toda UI de resultado distingue Enfrentamiento, Partido oficial, Partido EA y Serie (resolución).
- **UX-SCP-005** Candidatos EA y resultados oficiales tienen presentación visual distinta.

## 2. Landing

- **UX-LND-001** Primer viewport: marca Futrob, una promesa, una frase de apoyo, CTA group y visual dominante del producto.
- **UX-LND-002** Explica el flujo EA → candidatos → selección → confirmación sin prometer automatización perfecta.
- **UX-LND-003** No hay métricas de clientes inventadas ni logos de sponsors.
- **UX-LND-004** En 360 px no hay scroll horizontal de página.
- **UX-LND-005** Todo CTA lleva a ruta o estado real.

## 3. Shell y navegación

- **UX-NAV-001** La app muestra organización activa y, dentro de competición, la competición activa.
- **UX-NAV-002** Sidebar expandida/colapsada usable; iconos colapsados con nombre accesible.
- **UX-NAV-003** Web responsive usa Sheet; la app nativa usa tabs para destinos frecuentes + Más/Stack. Nada crítico queda solo en una sidebar oculta.
- **UX-NAV-004** Destino activo con `aria-current="page"` y no solo color.
- **UX-NAV-005** Volver desde detalle conserva filtros/scroll.
- **UX-NAV-006** URL directa de Encounter renderiza página completa.
- **UX-NAV-007** Sin permiso → 403 con salida segura.
- **UX-NAV-008** Un registro exitoso entra directamente al onboarding; un login exitoso comprueba primero onboarding y, solo si está completo, resuelve organizaciones.
- **UX-NAV-009** La navegación personal distingue Mis partidos, Mis estadísticas, Datos de juego e Invitaciones sin mostrar una organización ficticia.
- **UX-NAV-010** `/player` no renderiza el espacio personal hasta confirmar que el actor completó el onboarding; si está incompleto o la comprobación falla, vuelve de forma segura a `/onboarding`.
- **UX-NAV-011** Invitados y organizadores atraviesan Cuenta; omitir los datos EA conserva un perfil personal utilizable.
- **UX-NAV-012** El organizador termina en la configuración de su competición draft sin una consulta de destino adicional.
- **UX-NAV-013** La app nativa conserva el contexto activo —espacio personal, club EA, organización o competición— al navegar entre tabs y al reanudar desde background.
- **UX-NAV-014** Un deep link de invitación recibido sin sesión reanuda la aceptación después del login/signup y nunca pierde ni registra el token en telemetría.

## 4. Wizard / creación de competición

- **UX-WIZ-001** Pasos mínimos: identidad, edición/modalidad Clubs, formato, reglas de partidos (1–2, independiente/agregado), calendario, publicación.
- **UX-WIZ-002** Borrador guardable/reanudable.
- **UX-WIZ-003** Cambiar formato o partidos-por-enfrentamiento pide confirmación antes de borrar datos incompatibles.
- **UX-WIZ-004** Errores junto al campo + resumen enlazable.
- **UX-WIZ-005** Publicar muestra revisión final de edición, modalidad, formato, reglas y timezone.
- **UX-WIZ-006** El onboarding del organizador crea un draft con nombre, edición, plataforma, región, timezone y formato, sin generar stages ni fixture.
- **UX-WIZ-007** El Stepper de cinco pasos no produce scroll horizontal y en móvil anuncia número, total y nombre del paso actual.

## 5. Match Center

- **UX-MAT-001** Una fila permite identificar jornada/fecha, ambos equipos, marcador u horario, estado y acción.
- **UX-MAT-002** Mobile conserva identidad de ambos equipos; no colapsa a “A vs B” ambiguo.
- **UX-MAT-003** En series agregadas, el score primario y el agregado están etiquetados; no se confunden goles con “partido ganado”.
- **UX-MAT-004** Estados de selección/sync/disputa tienen texto e icono.
- **UX-MAT-005** Lista de candidatos muestra hora, resultado, duración, sides, jugadores clave y estado de uso.
- **UX-MAT-006** Asignar candidato a OfficialMatch 1/2 muestra preview antes de proponer.
- **UX-MAT-007** Confirmación rival, rechazo y contrapropuesta son acciones explícitas.
- **UX-MAT-008** Datos stale de sync muestran última actualización y acción de reintento segura.

## 6. Reprogramación

- **UX-SCH-001** El usuario elige alcance: enfrentamiento completo o partido oficial concreto.
- **UX-SCH-002** Propuesta muestra horario anterior, nuevo, motivo y expiración.
- **UX-SCH-003** Historial de propuestas/contrapropuestas es legible y auditado en UI autorizada.
- **UX-SCH-004** Partidos aprobados no ofrecen CTA de reprogramación; el control aparece deshabilitado con razón.

## 7. Standings, bracket y rankings

- **UX-STD-001** Tabla oficial legible en móvil con columnas prioritarias.
- **UX-BRK-001** Bracket tiene vista visual y lista accesible equivalente.
- **UX-BRK-002** Byes no muestran marcadores ficticios.
- **UX-RNK-001** Rankings muestran criterio y elegibilidad.
- **UX-RNK-002** Ranking de rendimiento de equipos está separado visualmente de la tabla oficial.

## 8. Portal público

- **UX-PUB-001** Sin acciones de capitán/organizador.
- **UX-PUB-002** Sin candidatos internos, payloads EA crudos ni disputas privadas.
- **UX-PUB-003** Branding de competición visible; navegación por tabs claras.

## 9. Accesibilidad y i18n

- **UX-A11Y-001** Web ofrece teclado completo, foco visible y restauración en diálogos; mobile expone labels, roles, hints y orden de lectura correctos a VoiceOver/TalkBack.
- **UX-A11Y-002** Contraste AA; estado no solo por color; targets ≥ 44 px en web touch y ≥ 44 dp en la app nativa.
- **UX-A11Y-003** Web respeta `prefers-reduced-motion`; mobile respeta la preferencia equivalente del sistema.
- **UX-I18N-001** Flujos críticos web y mobile en `es` y `en`.
- **UX-I18N-002** Horarios muestran zona de competición cuando el contexto de fixture lo requiere.
