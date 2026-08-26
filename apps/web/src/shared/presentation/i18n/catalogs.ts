export const SUPPORTED_LOCALES = ["es", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type TranslationParams = Readonly<Record<string, string | number>>;
export type Message = string | ((params: TranslationParams) => string);

const count = (params: TranslationParams): number => Number(params.count ?? 0);

const es = {
  "app.description":
    "Organiza ligas y copas de EA SPORTS FC Clubs con datos de partidos, resultados oficiales, tablas y brackets en un solo lugar.",
  "app.title": "Futrob | Competiciones FC Clubs",
  "app.imageAlt": "Futrob, operación confiable para competiciones FC Clubs",
  "locale.label": "Idioma",
  "locale.es": "Español",
  "locale.en": "Inglés",
  "common.back": "Volver",
  "common.skip": "Omitir por ahora",
  "common.retry": "Reintentar",
  "common.edit": "Editar",
  "common.pending": "Pendiente",
  "common.seconds": ({ seconds }) => `${seconds} s`,
  "shell.workspace.competitions": "Competiciones",
  "shell.workspace.eaClubs": "Clubes EA",
  "shell.workspace.organizations": "Organizaciones",
  "shell.workspace.noCompetitions": "Sin competiciones todavía",
  "shell.workspace.noClubs": "Sin clubes todavía",
  "shell.workspace.noOrganizations": "Sin organizaciones todavía",
  "shell.workspace.createCompetition": "Crear competición",
  "shell.workspace.createOrganization": "Crear organización",
  "shell.workspace.addClub": "Añadir club",
  "shell.workspace.pickOrganization.title": "Elegir organización",
  "shell.workspace.pickOrganization.description":
    "Elige en qué organización crearás la competición.",
  "shell.workspace.createOrganizationForCompetition.title": "Crear organización",
  "shell.workspace.createOrganizationForCompetition.description":
    "Necesitas una organización para hospedar la competición.",
  "shell.workspace.addClub.title": "Añadir club",
  "shell.workspace.addClub.description":
    "Busca un club de EA Clubs y enlázalo a tu perfil para localizar partidos.",
  "shell.workspace.addClub.confirm": "Añadir club",
  "shell.workspace.addClub.failed": "No se pudo añadir el club. Inténtalo de nuevo.",
  "shell.workspace.organizationFallback": "Organización",
  "shell.workspace.competitionFallback": "Competición",
  "shell.workspace.role.organizer": "Organizador",
  "shell.workspace.role.staff": "Staff",
  "shell.workspace.role.member": "Miembro",
  "shell.workspace.role.captain": "Capitán",
  "shell.workspace.role.viceCaptain": "Subcapitán",
  "shell.workspace.role.player": "Jugador",
  "shell.queue.label": "Tareas",
  "shell.queue.expand": "Expandir para ver las tareas",
  "shell.queue.empty.title": "Sin tareas pendientes",
  "shell.queue.empty.description": "Las tareas del espacio activo aparecerán aquí.",
  "support.retryAfter": ({ seconds }) => `Podrás reintentar en ${seconds} s.`,
  "support.codeLabel": "Código de soporte:",
  "support.copy.aria": "Copiar código de soporte",
  "support.copy.action": "Copiar código",
  "support.copy.done": "Copiado",
  "support.copy.success": "Código copiado",
  "support.copy.failure": "No se pudo copiar el código",
  "onboarding.shell.progress": "Progreso del onboarding",
  "onboarding.shell.stepSummary": ({ current, label, total }) =>
    `Paso ${current} de ${total} · ${label}`,
  "onboarding.step.start": "Inicio",
  "onboarding.step.configure": "Configurar",
  "onboarding.step.review": "Confirmar",
  "onboarding.step.organization": "Organización",
  "onboarding.step.competition": "Competición",
  "onboarding.step.account": "Cuenta",
  "onboarding.step.invitation": "Invitación",
  "onboarding.step.club": "Club",
  "onboarding.loading.progress": "Recuperando tu progreso…",
  "onboarding.loading.error": "No pudimos recuperar tu progreso. Inténtalo nuevamente.",
  "onboarding.intention.title": "¿Qué quieres hacer primero?",
  "onboarding.intention.description":
    "Esto nos ayuda a preparar Futrob para lo que quieres hacer primero.",
  "onboarding.intention.aria": "Intención del onboarding",
  "onboarding.intention.organization.label": "Organizar",
  "onboarding.intention.organization.description": "Crea una organización y una competición.",
  "onboarding.intention.invitation.label": "Unirme",
  "onboarding.intention.invitation.description": "Accede a una competición con tu código.",
  "onboarding.intention.player.label": "Empezar como jugador",
  "onboarding.intention.player.description": "Crea tu espacio personal.",
  "onboarding.intention.continue": "Continuar",
  "onboarding.organization.title": "Crea tu organización",
  "onboarding.organization.description":
    "Esta será la organización desde la que administrarás competiciones, equipos y resultados.",
  "onboarding.organization.name.label": "Nombre de la organización",
  "onboarding.organization.name.placeholder": "ej. Liga Nocturna",
  "onboarding.organization.name.required": "Escribe el nombre de la organización.",
  "onboarding.organization.name.max": "El nombre debe tener como máximo 120 caracteres.",
  "onboarding.organization.name.conflict": "Ese nombre ya está en uso. Elige otro.",
  "onboarding.organization.review": "Revisar organización",
  "onboarding.competition.title": "Configura tu primera competición",
  "onboarding.competition.description":
    "Crea un borrador de FC Clubs. Configurarás los equipos, el calendario y la publicación después.",
  "onboarding.competition.account": "Configurar cuenta",
  "onboarding.competition.name.label": "Nombre de la competición",
  "onboarding.competition.name.placeholder": "ej. Liga Futrob Apertura",
  "onboarding.competition.edition.legend": "Edición del juego",
  "onboarding.competition.edition.other": "Otra edición",
  "onboarding.competition.edition.name": "Nombre de la edición",
  "onboarding.competition.edition.placeholder": "ej. FC 24",
  "onboarding.competition.platform.label": "Plataforma de la competición",
  "onboarding.competition.region.label": "Región deportiva",
  "onboarding.competition.region.placeholder": "Selecciona una región",
  "onboarding.competition.timeZone.label": "Zona horaria",
  "onboarding.competition.timeZone.placeholder": "Selecciona una zona horaria",
  "onboarding.competition.format.label": "Formato",
  "onboarding.competition.format.initial": "Formato inicial",
  "onboarding.competition.format.placeholder": "Selecciona un formato",
  "onboarding.competition.format.description":
    "Las reglas iniciales se asignarán según el formato y podrás ajustarlas antes de publicar.",
  "onboarding.competition.validation.name.required": "Escribe el nombre de la competición.",
  "onboarding.competition.validation.name.max": "El nombre debe tener como máximo 120 caracteres.",
  "onboarding.competition.validation.edition.required":
    "Selecciona o escribe la edición del juego.",
  "onboarding.competition.validation.edition.max":
    "La edición debe tener como máximo 40 caracteres.",
  "onboarding.competition.validation.platform": "Selecciona la plataforma de la competición.",
  "onboarding.competition.validation.region": "Selecciona la región de la competición.",
  "onboarding.competition.validation.timeZone": "Selecciona una zona horaria válida.",
  "onboarding.competition.validation.format": "Selecciona el formato inicial de la competición.",
  "onboarding.region.america": "América",
  "onboarding.region.southAmerica": "Sudamérica",
  "onboarding.region.northCentralAmerica": "Norte y Centroamérica",
  "onboarding.region.europe": "Europa",
  "onboarding.region.africa": "África",
  "onboarding.region.asia": "Asia",
  "onboarding.region.middleEast": "Medio Oriente",
  "onboarding.region.oceania": "Oceanía",
  "onboarding.format.league": "Liga",
  "onboarding.format.knockout": "Eliminación directa",
  "onboarding.format.groupsKnockout": "Grupos + eliminación",
  "onboarding.format.leaguePlayoffs": "Liga + playoffs",
  "onboarding.account.title": "Configura tus datos de juego",
  "onboarding.account.description":
    "Registra tu identificador de EA sin compartir credenciales. Futrob lo usará para localizar tus partidos y estadísticas.",
  "onboarding.account.reuse.description":
    "La cuenta es personal, pero puedes usar la misma edición y plataforma de la competición.",
  "onboarding.account.reuse.action": "Usar datos de la competición",
  "onboarding.account.identifier.label": "Identificador de EA",
  "onboarding.account.identifier.placeholder": "ej. gamer23",
  "onboarding.account.platform.label": "Plataforma",
  "onboarding.account.identifier.required": "Escribe tu identificador de EA.",
  "onboarding.account.platform.required": "Selecciona la plataforma de esta cuenta.",
  "onboarding.account.edition.required": "Selecciona o escribe la edición del juego.",
  "onboarding.account.continue": "Continuar",
  "onboarding.account.linkContinue": "Vincular y continuar",
  "onboarding.account.review": "Revisar cuenta",
  "onboarding.account.linkReview": "Vincular y revisar",
  "onboarding.invitation.title": "Únete a una competición",
  "onboarding.invitation.description":
    "Escribe el código que recibiste para unirte a la competición al confirmar.",
  "onboarding.invitation.token.label": "Código de invitación",
  "onboarding.invitation.token.placeholder": "Pega el código que recibiste",
  "onboarding.invitation.token.description":
    "Comprobaremos el código antes de avanzar. No se guardará con tu progreso.",
  "onboarding.invitation.token.required": "Pega el código de invitación para continuar.",
  "onboarding.invitation.review": "Revisar invitación",
  "onboarding.invitation.retry": ({ seconds }) => `Reintentar en ${seconds} s`,
  "onboarding.invitation.continuePlayer": "Continuar como jugador",
  "onboarding.club.title": "Asocia tu club EA",
  "onboarding.club.description":
    "La asociación es opcional y declarativa. No verifica propiedad, ni crea un Team de competición ni te incorpora a una plantilla.",
  "onboarding.club.name.label": "Nombre del club",
  "onboarding.club.name.placeholder": "ej. Night Owls",
  "onboarding.club.reset": "Restablecer búsqueda",
  "onboarding.club.platform.aria": "Plataforma EA para la búsqueda",
  "onboarding.club.search.action": "Buscar club",
  "onboarding.club.search.loading": "Buscando…",
  "onboarding.club.search.retry": ({ seconds }) => `Reintentar en ${seconds} s`,
  "onboarding.club.search.loadingStatus": ({ query }) => `Buscando clubs para «${query}»…`,
  "onboarding.club.search.empty": ({ query }) => `No encontramos clubs para «${query}».`,
  "onboarding.club.search.results": (params) =>
    `${count(params)} club${count(params) === 1 ? "" : "s"} encontrado${count(params) === 1 ? "" : "s"}.`,
  "onboarding.club.search.failedStatus": "La búsqueda falló. Puedes intentarlo de nuevo.",
  "onboarding.club.search.rateLimited": "Alcanzaste el límite temporal de búsquedas.",
  "onboarding.club.search.failed": "No pudimos buscar clubs. Inténtalo nuevamente.",
  "onboarding.club.results.aria": "Resultados de clubs EA",
  "onboarding.club.review": "Revisar club",
  "onboarding.review.title": "Confirma tu configuración",
  "onboarding.review.description":
    "Revisa qué se guardará al confirmar. Si recargas o cierras esta página antes de confirmar, tendrás que completar los datos otra vez.",
  "onboarding.review.startingAs": "Cómo empezarás",
  "onboarding.review.organization": "Organización",
  "onboarding.review.competition": "Competición",
  "onboarding.review.gameAccount": "Cuenta de juego",
  "onboarding.review.club": "Club EA",
  "onboarding.review.invitationRole": "Rol en la competición",
  "onboarding.review.invitationRole.staff": "Staff",
  "onboarding.review.invitationRole.captain": "Capitán",
  "onboarding.review.invitationRole.player": "Jugador",
  "onboarding.review.invitationExpires": "Válida hasta",
  "onboarding.review.playerReady": "Perfil de jugador listo · Datos EA para después",
  "onboarding.review.noClub": "Sin club asociado por ahora",
  "onboarding.review.edit": ({ label }) => `Editar ${String(label).toLowerCase()}`,
  "onboarding.review.incomplete": "Completa los datos pendientes antes de confirmar.",
  "onboarding.review.retry": ({ seconds }) => `Reintentar en ${seconds} s`,
  "onboarding.review.finish.organization": "Crear organización y competición",
  "onboarding.review.finish.invitation": "Aceptar invitación",
  "onboarding.review.finish.player": "Entrar a mi espacio",
  "errors.fallback": "No pudimos completar la operación. Inténtalo nuevamente.",
  "errors.onboarding.organizationCheck": "No pudimos verificar el nombre. Inténtalo nuevamente.",
  "errors.onboarding.saveProgress": "No pudimos guardar tu progreso. Inténtalo nuevamente.",
  "errors.api.rate_limited":
    "Alcanzaste el límite temporal. Espera antes de intentarlo nuevamente.",
  "errors.product_api.unreachable": "No pudimos conectar con el servicio. Inténtalo nuevamente.",
  "errors.product_api.bff_misconfigured": "La conexión con el servicio no está configurada.",
  "errors.auth.misconfigured": "El servicio de autenticación no está configurado.",
  "errors.auth.unavailable":
    "No pudimos conectar con el servicio de autenticación. Inténtalo nuevamente.",
  "errors.auth.unhandled": "No pudimos completar el inicio de sesión. Inténtalo nuevamente.",
  "errors.auth.unauthenticated": "Necesitas iniciar sesión para continuar.",
  "errors.organizations.invitation_not_found":
    "No encontramos esa invitación. Revisa el código e inténtalo nuevamente.",
  "errors.organizations.invitation_expired":
    "La invitación ha caducado. Solicita una nueva al organizador.",
  "errors.organizations.invitation_revoked":
    "La invitación fue revocada. Solicita una nueva al organizador.",
  "errors.organizations.invitation_invalid": "La invitación ya no está disponible.",
  "errors.organizations.invitation_exhausted": "La invitación alcanzó el número máximo de usos.",
  "errors.organizations.name_conflict":
    "Ese nombre de organización ya está en uso. Vuelve y elige otro.",
  "errors.organizations.invalid_name": "El nombre de la organización no es válido.",
  "errors.onboarding.invalidCompetition":
    "Los datos de la competición no son válidos. Revísalos e inténtalo nuevamente.",
  "errors.onboarding.invalidGameAccount":
    "Los datos de la cuenta de juego no son válidos. Revísalos e inténtalo nuevamente.",
  "errors.onboarding.createOrganization": "No pudimos crear la organización. Inténtalo nuevamente.",
  "errors.onboarding.completePlayer":
    "No pudimos guardar tu perfil de jugador. Inténtalo nuevamente.",
  "errors.onboarding.finish": "No pudimos finalizar tu configuración. Inténtalo nuevamente.",
  "player.nav.matches": "Mis partidos",
  "player.nav.statistics": "Mis estadísticas",
  "player.nav.gameData": "Datos de juego",
  "player.workspace.eyebrow": "Espacio personal",
  "player.matches.title": "Mis partidos",
  "player.matches.description": "Apariciones en el club seleccionado.",
  "player.matches.loading": "Cargando tus partidos…",
  "player.matches.error": "No pudimos cargar tus partidos.",
  "player.matches.emptyTitle": "Aún no hay partidos oficiales",
  "player.matches.historyLabel": "Historial de partidos oficiales",
  "player.matches.loadMore": "Cargar más partidos",
  "player.matches.loadMore.loading": "Cargando más partidos…",
  "player.matches.open": "Abrir Mis partidos",
  "player.matches.view.label": "Tipo de partido",
  "player.matches.view.all": "Todos",
  "player.matches.view.league": "Liga",
  "player.matches.view.playoff": "Playoff",
  "player.matches.view.friendly": "Amistosos",
  "player.matches.sort.label": "Orden de partidos",
  "player.matches.sort.newest": "Más recientes",
  "player.matches.sort.oldest": "Más antiguos",
  "player.matches.results.count": ({ count }) => (count === 1 ? "1 partido" : `${count} partidos`),
  "player.matches.record.wins": "Ganados",
  "player.matches.record.draws": "Empates",
  "player.matches.record.losses": "Derrotas",
  "player.matches.record.label": "Resumen de esta vista",
  "player.matches.record.loading": "Cargando el resumen de partidos…",
  "player.matches.stats.performance": "Rendimiento",
  "player.matches.stats.record": "Record",
  "player.matches.stats.contributions": "Contribuciones",
  "player.matches.contributions.composition": ({ goals, assists }) => {
    const goalsCount = Number(goals);
    const assistsCount = Number(assists);
    const goalsLabel = goalsCount === 1 ? "1 gol" : `${goalsCount} goles`;
    const assistsLabel = assistsCount === 1 ? "1 asistencia" : `${assistsCount} asistencias`;
    return `${goalsLabel} · ${assistsLabel}`;
  },
  "player.matches.contributions.goalsOnly": ({ count }) =>
    Number(count) === 1 ? "1 gol" : `${Number(count)} goles`,
  "player.matches.contributions.assistsOnly": ({ count }) =>
    Number(count) === 1 ? "1 asistencia" : `${Number(count)} asistencias`,
  "player.matches.contributions.contributed": "Con G+A",
  "player.matches.contributions.pace": "Por partido",
  "player.matches.contributions.share": "De los goles",
  "player.matches.contributions.contributedValue": ({ contributed, played }) =>
    `${contributed}/${played}`,
  "player.matches.contributions.shareValue": ({ percent }) => `${percent}%`,
  "player.matches.contributions.contributedTooltip": ({ contributed, played, playedCount }) => {
    const matchWord = Number(playedCount) === 1 ? "partido" : "partidos";
    return `Marcaste o asististe en ${contributed} de ${played} ${matchWord}. No cuenta partidos sin datos de goles o asistencias.`;
  },
  "player.matches.contributions.contributedTooltip.empty":
    "Partidos en los que marcaste o asististe. No hay partidos con datos de goles o asistencias.",
  "player.matches.contributions.paceTooltip": ({ rate }) => `Media de ${rate} G+A por partido.`,
  "player.matches.contributions.paceTooltip.empty":
    "Media de G+A por partido. No hay datos de goles o asistencias para calcularla.",
  "player.matches.contributions.shareTooltip": ({ percent }) =>
    `Marcaste el ${percent}% de los goles del club. No incluye asistencias.`,
  "player.matches.contributions.shareTooltip.noClubGoals":
    "Porcentaje de los goles del club que marcaste. En esta vista el club no tiene goles.",
  "player.matches.contributions.shareTooltip.unknown":
    "Porcentaje de los goles del club que marcaste. No hay datos de goles para calcularlo.",
  "player.matches.performance.averageRating": "Rating promedio",
  "player.matches.performance.vsLast": ({ count }) => `vs últimos ${count}`,
  "player.matches.performance.improved": "Ha mejorado",
  "player.matches.performance.declined": "Ha empeorado",
  "player.matches.performance.unchanged": "Sin cambios",
  "player.matches.performance.trendAria": ({ status, delta, count }) =>
    `${status}. ${delta} vs últimos ${count}`,
  "player.matches.form.label": "Forma reciente",
  "player.matches.form.win": ({ score, opponent }) => `Victoria ${score} contra ${opponent}`,
  "player.matches.form.draw": ({ score, opponent }) => `Empate ${score} contra ${opponent}`,
  "player.matches.form.loss": ({ score, opponent }) => `Derrota ${score} contra ${opponent}`,
  "player.matches.form.unknownMatch": ({ home, score, away }) => `${home} ${score} ${away}`,
  "player.matches.form.winShort": "V",
  "player.matches.form.drawShort": "E",
  "player.matches.form.lossShort": "D",
  "player.matches.form.unknownShort": "—",
  "player.matches.day.today": "Hoy",
  "player.matches.day.yesterday": "Ayer",
  "player.matches.mvp": "MVP",
  "player.matches.mvp.named": ({ name }) => `${name} MVP`,
  "player.matches.dnf": "Ganado por desconexión",
  "player.matches.notPlayed": "No jugaste",
  "player.matches.openMatch": "Ver partido",
  "player.matches.openMatchLabel": ({ home, homeGoals, awayGoals, away }) =>
    `Ver ${home} ${homeGoals} – ${awayGoals} ${away}`,
  "player.matchDetail.breadcrumb": "Migas de pan",
  "player.matchDetail.breadcrumb.match": "Partido",
  "player.matchDetail.vs": "vs",
  "player.matchDetail.loading": "Cargando plantillas…",
  "player.matchDetail.error": "No se pudo cargar el partido. Inténtalo de nuevo.",
  "player.matchDetail.notFound.title": "Partido no encontrado",
  "player.matchDetail.notFound.description":
    "Este partido no está disponible en tus 50 partidos recientes.",
  "player.matchDetail.needsClub.title": "Asocia un club para ver este partido",
  "player.matchDetail.needsClub.description":
    "Selecciona o asocia un club para buscar el partido entre sus datos recientes.",
  "player.matchDetail.needsGameAccount.title": "Añade una cuenta de juego",
  "player.matchDetail.needsGameAccount.description":
    "Añade tu identificador de juego para reconocer si participaste en el partido.",
  "player.matchDetail.selectedClub": "Club seleccionado",
  "player.matchDetail.opponent": "Rival",
  "player.matchDetail.yourMatch": "Tu partido",
  "player.matchDetail.you": "Tú",
  "player.matchDetail.roster": "Plantilla",
  "player.matchDetail.roster.empty": "No hay datos de jugadores para esta plantilla.",
  "player.matchDetail.tab.summary": "Resumen",
  "player.matchDetail.tab.players": "Jugadores",
  "player.matchDetail.tab.facts": "Datos del partido",
  "player.matchDetail.comparison": "Comparación de equipos",
  "player.matchDetail.performance": "Tu rendimiento",
  "player.matchDetail.performance.empty.description":
    "No alineaste con el club seleccionado en este partido.",
  "player.matchDetail.performance.passAccuracy": "Precisión de pase",
  "player.matchDetail.performance.tackleAccuracy": "Precisión de entradas",
  "player.matchDetail.highlights": "Destacados del partido",
  "player.matchDetail.highlights.mvp": "MVP",
  "player.matchDetail.highlights.scorer": "Goleador",
  "player.matchDetail.highlights.playmaker": "Asistidor",
  "player.matchDetail.highlights.rival": "Mejor del rival",
  "player.matchDetail.highlights.empty": "No hay destacados para este partido.",
  "player.matchDetail.highlights.passAccuracy": ({ percent }) => `${percent} precisión de pase`,
  "player.matchDetail.highlights.assists": ({ count }) =>
    count === 1 ? "1 asistencia" : `${count} asistencias`,
  "player.matchDetail.highlights.shots": ({ count }) => (count === 1 ? "1 tiro" : `${count} tiros`),
  "player.matchDetail.highlights.tackles": ({ count }) =>
    count === 1 ? "1 entrada" : `${count} entradas`,
  "player.matchDetail.highlights.rating": ({ rating }) => `${rating} rating`,
  "player.matchDetail.minutesPlayed": ({ minutes }) => `${minutes} min`,
  "player.matchDetail.metric.passAccuracy": "Precisión de pase",
  "player.matchDetail.complete": "Datos completos",
  "player.matchDetail.partial": "Datos parciales",
  "player.matchDetail.unknown": "Completitud desconocida",
  "player.matchDetail.disconnected": "Partido desconectado",
  "player.matchDetail.forfeit": "Ganado por desconexión",
  "player.matchDetail.facts.type": "Tipo",
  "player.matchDetail.facts.completeness": "Completitud",
  "player.matchDetail.facts.duration": "Duración",
  "player.matchDetail.facts.game": "Juego",
  "player.matchDetail.facts.provider": "Proveedor",
  "player.matchDetail.provider": ({ provider }) => `${provider}`,
  "player.matchDetail.game": ({ edition, platform }) => `${edition} · ${platform}`,
  "player.matchDetail.duration.seconds": ({ seconds }) => `${seconds} s`,
  "player.matchDetail.duration.minutes": ({ minutes }) => `${minutes} min`,
  "player.matchDetail.duration.minutesSeconds": ({ minutes, seconds }) =>
    `${minutes} min ${seconds} s`,
  "player.matchDetail.metric.position": "Posición",
  "player.matchDetail.position.goalkeeper": "Portero",
  "player.matchDetail.position.defender": "Defensa",
  "player.matchDetail.position.midfielder": "Centrocampista",
  "player.matchDetail.position.forward": "Delantero",
  "player.matches.outcome.win": "Victoria",
  "player.matches.outcome.draw": "Empate",
  "player.matches.outcome.loss": "Derrota",
  "player.matches.outcome.unknown": "Sin resultado",
  "player.matches.finalized": "Finalizado",
  "player.matches.vs": "–",
  "player.matches.appearance.goalsUnit": ({ count }) => (count === 1 ? "gol" : "goles"),
  "player.matches.appearance.assistsUnit": ({ count }) =>
    count === 1 ? "asistencia" : "asistencias",
  "player.matches.recent.title": "Recientes",
  "player.matches.recent.loading": "Cargando partidos recientes…",
  "player.matches.recent.error": "No pudimos cargar tus partidos recientes.",
  "player.matches.recent.historyLabel": "Partidos recientes",
  "player.matches.recent.needsClub.title": "Asocia un club para ver partidos recientes",
  "player.matches.recent.needsClub.description":
    "Los partidos recientes salen de los clubes que asocies. Tu identificador de juego solo reconoce tus apariciones.",
  "player.matches.recent.needsGameAccount.title": "Añade una cuenta de juego",
  "player.matches.recent.needsGameAccount.description":
    "Asocia un identificador de juego para reconocer tus apariciones en los partidos de tus clubes.",
  "player.matches.recent.emptyTitle": "No hay partidos recientes",
  "player.matches.recent.emptyDescription":
    "Todavía no hay apariciones recientes en el club seleccionado.",
  "player.matches.all.historyLabel": "Todos los partidos",
  "player.matches.all.emptyTitle": "No hay partidos",
  "player.matches.all.emptyDescription": "Todavía no hay apariciones en el club seleccionado.",
  "player.matches.league.historyLabel": "Partidos de liga",
  "player.matches.league.emptyTitle": "No hay partidos de liga",
  "player.matches.league.emptyDescription":
    "Todavía no hay apariciones de liga en el club seleccionado.",
  "player.matches.playoff.historyLabel": "Partidos de playoff",
  "player.matches.playoff.emptyTitle": "No hay playoffs",
  "player.matches.playoff.emptyDescription":
    "Todavía no hay apariciones de playoff en el club seleccionado.",
  "player.matches.friendly.historyLabel": "Partidos amistosos",
  "player.matches.friendly.emptyTitle": "No hay amistosos",
  "player.matches.friendly.emptyDescription":
    "Todavía no hay apariciones amistosas en el club seleccionado.",
  "player.matches.type.league": "Liga",
  "player.matches.type.playoff": "Playoff",
  "player.matches.type.friendly": "Amistoso",
  "player.matches.metric.yellowCards": "Amarillas",
  "player.matches.metric.redCards": "Rojas",
  "player.matches.feat.hatTrick": "Hat-trick",
  "player.matches.feat.poker": "Póker",
  "player.matches.feat.repoker": "Repóker",
  "player.matches.feat.scorer": ({ name }) => `Hecho por ${name}`,
  "player.statistics.title": "Tu perfil",
  "player.statistics.description":
    "Tú como jugador: ELO, atributos y estadísticas de todos los partidos que has jugado.",
  "player.statistics.loading": "Cargando tu perfil…",
  "player.statistics.error": "No pudimos cargar tu perfil.",
  "player.statistics.emptyTitle": "Aún no hay apariciones tuyas",
  "player.statistics.emptyDescription":
    "Cuando alinees, esta página será tu perfil de jugador: ELO, atributos y evolución.",
  "player.statistics.needsClub.title": "Asocia un club para reconocer tus partidos",
  "player.statistics.needsClub.description":
    "Tu perfil se arma con tus apariciones. Un club asociado nos deja encontrarlas.",
  "player.statistics.needsGameAccount.title": "Registra tu identificador de juego",
  "player.statistics.needsGameAccount.description":
    "Sin cuenta de juego no podemos reconocerte en los partidos.",
  "player.statistics.open": "Abrir tu perfil",
  "player.statistics.matchesCount": ({ count }) => `${count} partidos jugados`,
  "player.statistics.sampleHint": "Sobre tus apariciones recientes (hasta 50 partidos).",
  "player.statistics.tableLabel": "Estadísticas del jugador",
  "player.statistics.metric": "Métrica",
  "player.statistics.total": "Total",
  "player.statistics.average": "Promedio",
  "player.statistics.status": "Estado",
  "player.statistics.elo": "ELO",
  "player.statistics.elo.hint": ({ count }) =>
    count === 1 ? "1 partido puntuado" : `${count} partidos puntuados`,
  "player.statistics.record": "W–D–L",
  "player.statistics.summary": "Resumen",
  "player.statistics.attributes": "Perfil por categorías",
  "player.statistics.evolution": "Evolución",
  "player.statistics.evolution.empty": "Juega más partidos para ver tu evolución.",
  "player.statistics.tab.general": "Generales",
  "player.statistics.tab.team": "Por equipo",
  "player.statistics.tab.position": "Por posición",
  "player.statistics.attribute.attack": "Ataque",
  "player.statistics.attribute.pass": "Pase",
  "player.statistics.attribute.defense": "Defensa",
  "player.statistics.attribute.impact": "Impacto",
  "player.statistics.attribute.discipline": "Disciplina",
  "player.statistics.component.goalsPerMatch": "Goles por partido",
  "player.statistics.component.shotsPerMatch": "Tiros por partido",
  "player.statistics.component.shotAccuracy": "Acierto de tiro",
  "player.statistics.component.offensiveRoleRating": "Rating ofensivo por rol",
  "player.statistics.component.passSuccess": "% éxito de pase",
  "player.statistics.component.passVolume": "Cantidad de pases",
  "player.statistics.component.tacklesMadePerMatch": "Entradas con éxito por partido",
  "player.statistics.component.tackleSuccess": "% éxito entradas",
  "player.statistics.component.defensiveRoleRating": "Rating en posiciones defensivas",
  "player.statistics.component.averageRating": "Rating promedio",
  "player.statistics.component.winRate": "% victorias",
  "player.statistics.component.goalsAssistsPerMatch": "G+A por partido",
  "player.statistics.component.fewerRedsPerMatch": "Disciplina (menos rojas por partido)",
  "player.statistics.component.points": ({ points }) => `${points} puntos`,
  "player.statistics.component.confidence": ({ percent }) => `confianza ${percent}%`,
  "player.statistics.component.weightedMatches": ({ count }) =>
    count === 1 ? "1 pj ponderado" : `${count} pj ponderados`,
  "player.statistics.team": "Equipo",
  "player.statistics.position": "Posición",
  "player.gameData.review": "Revisar datos de juego",
  "player.backToWorkspace": "Volver al espacio personal",
  "player.retry": "Reintentar",
  "player.partialData": "Datos parciales",
  "player.partialData.description":
    "Algunas métricas no estuvieron disponibles en todos los partidos y se marcan en la tabla.",
  "player.completeData": "Completo",
  "player.noData": "Sin datos",
  "player.onboarding.checking": "Comprobando tu onboarding…",
  "player.metric.goals": "Goles",
  "player.metric.assists": "Asistencias",
  "player.metric.goalsPlusAssists": "G+A",
  "player.metric.shots": "Tiros",
  "player.metric.passAttempts": "Pases intentados",
  "player.metric.passesMade": "Pases completados",
  "player.metric.tackleAttempts": "Entradas intentadas",
  "player.metric.tacklesMade": "Entradas completadas",
  "player.metric.saves": "Paradas",
  "player.metric.yellowCards": "Tarjetas amarillas",
  "player.metric.redCards": "Tarjetas rojas",
  "player.metric.mvpAwards": "Premios MVP",
  "player.metric.rating": "Rating",
  "player.metric.matches": "Partidos",
  "player.metric.minutes": "Minutos",
  "player.position.unknown": "Posición sin datos",
  "landing.meta.title": "Futrob | Del partido de EA al resultado oficial",
  "landing.meta.description":
    "Opera ligas y copas de FC Clubs con datos reales de EA: selección auditable de partidos oficiales, tabla, rankings y portal público.",
  "landing.nav.aria": "Acceso",
  "landing.nav.login": "Iniciar sesión",
  "landing.nav.signup": "Crear cuenta",
  "landing.hero.eyebrow": "Competiciones FC Clubs",
  "landing.hero.titleLead": "Del partido de EA al",
  "landing.hero.titleHighlight": "resultado oficial",
  "landing.hero.subtitleLead": "Los capitanes eligen los partidos que cuentan.",
  "landing.hero.subtitleRest":
    "Tú apruebas el resultado y Futrob actualiza la tabla automáticamente.",
  "landing.hero.cta.primary": "Crear cuenta",
  "landing.hero.cta.secondary": "Ver cómo funciona",
  "landing.status.approved": "Aprobado",
  "landing.status.candidate": "Candidato EA",
  "landing.status.selecting": "En selección",
  "landing.status.synced": "Sync EA",
  "landing.status.scheduled": "Programado",
  "landing.matches.title": "La mesa de operaciones",
  "landing.matches.subtitle":
    "Cada enfrentamiento muestra de dónde viene su resultado y en qué estado está. Nada se publica sin pasar por la aprobación.",
  "landing.matches.matchday": "Jornada 4 · Liga Metropolitana",
  "landing.mechanism.title": "Cómo un partido se vuelve oficial",
  "landing.mechanism.subtitle": "El mismo recorrido para cada resultado, siempre auditable.",
  "landing.mechanism.sync.title": "Sync EA",
  "landing.mechanism.sync.description":
    "Futrob sincroniza los partidos de tus clubs desde EA y los guarda como candidatos, nunca como oficiales.",
  "landing.mechanism.selection.title": "Selección",
  "landing.mechanism.selection.description":
    "Los capitanes eligen cuáles partidos cuentan para el enfrentamiento, con vista previa de la serie.",
  "landing.mechanism.approval.title": "Aprobación",
  "landing.mechanism.approval.description":
    "El resultado confirmado queda aprobado y auditado. El sync nunca auto-oficializa.",
  "landing.mechanism.publication.title": "Publicación",
  "landing.mechanism.publication.description":
    "Solo lo aprobado actualiza tabla, bracket, rankings y el portal público.",
  "landing.demo.title": "Pruébalo contra la API real",
  "landing.demo.subtitle":
    "Busca tu club de EA Clubs. Es la misma capa de datos que alimenta tus competiciones.",
  "gameData.clubSearch.source": "Resultados de /api/v1/game-data/clubs/search.",
  "landing.players.title": "Para jugadores: tus partidos, tus números",
  "landing.players.subtitle":
    "El perfil personal existe sin organización: vincula tu club EA y sigue tu rendimiento.",
  "landing.players.matches.title": "Mis partidos",
  "landing.players.matches.description":
    "Recientes y todos, con liga, playoff o amistoso marcados en cada tarjeta.",
  "landing.players.stats.title": "Mis estadísticas",
  "landing.players.stats.description":
    "Historial oficial de contribuciones: goles, asistencias y ratings por partido.",
  "landing.players.feats.title": "Hazañas marcadas",
  "landing.players.feats.description": "Hat-trick, póker y repóker se reconocen en cada aparición.",
  "landing.portal.title": "Un portal público a la altura de tu torneo",
  "landing.portal.subtitle":
    "Publica portada, equipos, calendario, resultados, tabla, bracket y rankings — cuando tú decides.",
  "landing.portal.point.teams": "Equipos y calendario siempre al día",
  "landing.portal.point.results": "Resultados y tabla oficiales",
  "landing.portal.point.rankings": "Rankings de jugadores y equipos",
  "landing.cta.title": "¿Listo para poner tu competición bajo control?",
  "landing.cta.subtitle": "Crea tu organización y publica tu primera competición hoy.",
  "landing.cta.primary": "Crear cuenta",
  "landing.cta.secondary": "Iniciar sesión",
  "landing.footer.tagline": "Preciso para operar. Claro para competir.",
  "landing.footer.madeBy": "Futrob es creado por Davion Software.",
  "landing.footer.legal": "© 2026 Futrob",
} satisfies Record<string, Message>;

export type MessageKey = keyof typeof es;
export type Catalog = Readonly<{ [K in MessageKey]: Message }>;

export interface MessageParamsByKey {
  readonly "common.seconds": { readonly seconds: number };
  readonly "support.retryAfter": { readonly seconds: number };
  readonly "onboarding.shell.stepSummary": {
    readonly current: number;
    readonly label: string;
    readonly total: number;
  };
  readonly "onboarding.club.search.retry": { readonly seconds: number };
  readonly "onboarding.club.search.loadingStatus": { readonly query: string };
  readonly "onboarding.club.search.empty": { readonly query: string };
  readonly "onboarding.club.search.results": { readonly count: number };
  readonly "onboarding.invitation.retry": { readonly seconds: number };
  readonly "onboarding.review.edit": { readonly label: string };
  readonly "onboarding.review.retry": { readonly seconds: number };
  readonly "player.statistics.matchesCount": { readonly count: number };
  readonly "player.statistics.elo.hint": { readonly count: number };
  readonly "player.statistics.component.points": { readonly points: number };
  readonly "player.statistics.component.confidence": { readonly percent: number };
  readonly "player.statistics.component.weightedMatches": { readonly count: number };
  readonly "player.matches.results.count": { readonly count: number };
  readonly "player.matches.openMatchLabel": {
    readonly home: string;
    readonly homeGoals: number;
    readonly awayGoals: number;
    readonly away: string;
  };
  readonly "player.matches.mvp.named": { readonly name: string };
  readonly "player.matches.feat.scorer": { readonly name: string };
  readonly "player.matches.appearance.goalsUnit": { readonly count: number };
  readonly "player.matches.appearance.assistsUnit": { readonly count: number };
  readonly "player.matches.performance.vsLast": { readonly count: number };
  readonly "player.matches.performance.trendAria": {
    readonly status: string;
    readonly delta: string;
    readonly count: number;
  };
  readonly "player.matches.form.win": { readonly score: string; readonly opponent: string };
  readonly "player.matches.form.draw": { readonly score: string; readonly opponent: string };
  readonly "player.matches.form.loss": { readonly score: string; readonly opponent: string };
  readonly "player.matches.form.unknownMatch": {
    readonly home: string;
    readonly score: string;
    readonly away: string;
  };
  readonly "player.matches.contributions.composition": {
    readonly goals: number;
    readonly assists: number;
  };
  readonly "player.matches.contributions.goalsOnly": { readonly count: number };
  readonly "player.matches.contributions.assistsOnly": { readonly count: number };
  readonly "player.matches.contributions.contributedValue": {
    readonly contributed: string;
    readonly played: string;
  };
  readonly "player.matches.contributions.shareValue": { readonly percent: string };
  readonly "player.matches.contributions.contributedTooltip": {
    readonly contributed: string;
    readonly played: string;
    readonly playedCount: number;
  };
  readonly "player.matches.contributions.paceTooltip": { readonly rate: string };
  readonly "player.matches.contributions.shareTooltip": { readonly percent: string };
  readonly "player.matchDetail.highlights.passAccuracy": { readonly percent: string };
  readonly "player.matchDetail.highlights.assists": { readonly count: number };
  readonly "player.matchDetail.highlights.shots": { readonly count: number };
  readonly "player.matchDetail.highlights.tackles": { readonly count: number };
  readonly "player.matchDetail.highlights.rating": { readonly rating: string };
  readonly "player.matchDetail.minutesPlayed": { readonly minutes: number };
  readonly "player.matchDetail.provider": { readonly provider: string };
  readonly "player.matchDetail.game": {
    readonly edition: string;
    readonly platform: string;
  };
  readonly "player.matchDetail.duration.seconds": { readonly seconds: number };
  readonly "player.matchDetail.duration.minutes": { readonly minutes: number };
  readonly "player.matchDetail.duration.minutesSeconds": {
    readonly minutes: number;
    readonly seconds: number;
  };
}

export type ParameterizedMessageKey = keyof MessageParamsByKey;
export type ParameterlessMessageKey = Exclude<MessageKey, ParameterizedMessageKey>;

const en: Catalog = {
  "app.description":
    "Run EA SPORTS FC Clubs leagues and cups with match data, official results, tables, and brackets in one place.",
  "app.title": "Futrob | FC Clubs competitions",
  "app.imageAlt": "Futrob, reliable operations for FC Clubs competitions",
  "locale.label": "Language",
  "locale.es": "Spanish",
  "locale.en": "English",
  "common.back": "Back",
  "common.skip": "Skip for now",
  "common.retry": "Try again",
  "common.edit": "Edit",
  "common.pending": "Pending",
  "common.seconds": ({ seconds }) => `${seconds}s`,
  "shell.workspace.competitions": "Competitions",
  "shell.workspace.eaClubs": "EA Clubs",
  "shell.workspace.organizations": "Organizations",
  "shell.workspace.noCompetitions": "No competitions yet",
  "shell.workspace.noClubs": "No clubs yet",
  "shell.workspace.noOrganizations": "No organizations yet",
  "shell.workspace.createCompetition": "Create competition",
  "shell.workspace.createOrganization": "Create organization",
  "shell.workspace.addClub": "Add club",
  "shell.workspace.pickOrganization.title": "Choose organization",
  "shell.workspace.pickOrganization.description":
    "Choose which organization will host the competition.",
  "shell.workspace.createOrganizationForCompetition.title": "Create organization",
  "shell.workspace.createOrganizationForCompetition.description":
    "You need an organization to host the competition.",
  "shell.workspace.addClub.title": "Add club",
  "shell.workspace.addClub.description":
    "Search an EA Clubs club and link it to your profile so Futrob can find your matches.",
  "shell.workspace.addClub.confirm": "Add club",
  "shell.workspace.addClub.failed": "The club could not be added. Try again.",
  "shell.workspace.organizationFallback": "Organization",
  "shell.workspace.competitionFallback": "Competition",
  "shell.workspace.role.organizer": "Organizer",
  "shell.workspace.role.staff": "Staff",
  "shell.workspace.role.member": "Member",
  "shell.workspace.role.captain": "Captain",
  "shell.workspace.role.viceCaptain": "Vice captain",
  "shell.workspace.role.player": "Player",
  "shell.queue.label": "Tasks",
  "shell.queue.expand": "Expand to see tasks",
  "shell.queue.empty.title": "No pending tasks",
  "shell.queue.empty.description": "Tasks for the active workspace will show up here.",
  "support.retryAfter": ({ seconds }) => `You can try again in ${seconds}s.`,
  "support.codeLabel": "Support code:",
  "support.copy.aria": "Copy support code",
  "support.copy.action": "Copy code",
  "support.copy.done": "Copied",
  "support.copy.success": "Code copied",
  "support.copy.failure": "The support code could not be copied",
  "onboarding.shell.progress": "Onboarding progress",
  "onboarding.shell.stepSummary": ({ current, label, total }) =>
    `Step ${current} of ${total} · ${label}`,
  "onboarding.step.start": "Start",
  "onboarding.step.configure": "Set up",
  "onboarding.step.review": "Confirm",
  "onboarding.step.organization": "Organization",
  "onboarding.step.competition": "Competition",
  "onboarding.step.account": "Account",
  "onboarding.step.invitation": "Invitation",
  "onboarding.step.club": "Club",
  "onboarding.loading.progress": "Restoring your progress…",
  "onboarding.loading.error": "We couldn't restore your progress. Try again.",
  "onboarding.intention.title": "What do you want to do first?",
  "onboarding.intention.description":
    "Your choice helps us prepare Futrob for what you want to do first.",
  "onboarding.intention.aria": "Onboarding goal",
  "onboarding.intention.organization.label": "Organize",
  "onboarding.intention.organization.description": "Create an organization and a competition.",
  "onboarding.intention.invitation.label": "Join",
  "onboarding.intention.invitation.description": "Access a competition with your code.",
  "onboarding.intention.player.label": "Start as a player",
  "onboarding.intention.player.description": "Create your personal space.",
  "onboarding.intention.continue": "Continue",
  "onboarding.organization.title": "Create your organization",
  "onboarding.organization.description":
    "This is the organization where you'll manage competitions, teams, and results.",
  "onboarding.organization.name.label": "Organization name",
  "onboarding.organization.name.placeholder": "e.g. Night League",
  "onboarding.organization.name.required": "Enter the organization name.",
  "onboarding.organization.name.max": "The name must be 120 characters or fewer.",
  "onboarding.organization.name.conflict": "That name is already in use. Choose another one.",
  "onboarding.organization.review": "Review organization",
  "onboarding.competition.title": "Set up your first competition",
  "onboarding.competition.description":
    "Create an FC Clubs draft. You'll set up teams, the schedule, and publishing later.",
  "onboarding.competition.account": "Set up account",
  "onboarding.competition.name.label": "Competition name",
  "onboarding.competition.name.placeholder": "e.g. Futrob Opening League",
  "onboarding.competition.edition.legend": "Game edition",
  "onboarding.competition.edition.other": "Another edition",
  "onboarding.competition.edition.name": "Edition name",
  "onboarding.competition.edition.placeholder": "e.g. FC 24",
  "onboarding.competition.platform.label": "Competition platform",
  "onboarding.competition.region.label": "Competition region",
  "onboarding.competition.region.placeholder": "Select a region",
  "onboarding.competition.timeZone.label": "Time zone",
  "onboarding.competition.timeZone.placeholder": "Select a time zone",
  "onboarding.competition.format.label": "Format",
  "onboarding.competition.format.initial": "Initial format",
  "onboarding.competition.format.placeholder": "Select a format",
  "onboarding.competition.format.description":
    "We'll assign safe starting rules for the format. You can adjust them before publishing.",
  "onboarding.competition.validation.name.required": "Enter the competition name.",
  "onboarding.competition.validation.name.max": "The name must be 120 characters or fewer.",
  "onboarding.competition.validation.edition.required": "Select or enter the game edition.",
  "onboarding.competition.validation.edition.max": "The edition must be 40 characters or fewer.",
  "onboarding.competition.validation.platform": "Select the competition platform.",
  "onboarding.competition.validation.region": "Select the competition region.",
  "onboarding.competition.validation.timeZone": "Select a valid time zone.",
  "onboarding.competition.validation.format": "Select the initial competition format.",
  "onboarding.region.america": "Americas",
  "onboarding.region.southAmerica": "South America",
  "onboarding.region.northCentralAmerica": "North and Central America",
  "onboarding.region.europe": "Europe",
  "onboarding.region.africa": "Africa",
  "onboarding.region.asia": "Asia",
  "onboarding.region.middleEast": "Middle East",
  "onboarding.region.oceania": "Oceania",
  "onboarding.format.league": "League",
  "onboarding.format.knockout": "Single elimination",
  "onboarding.format.groupsKnockout": "Groups and elimination",
  "onboarding.format.leaguePlayoffs": "League and playoffs",
  "onboarding.account.title": "Set up your game details",
  "onboarding.account.description":
    "Add your EA identifier without sharing credentials. Futrob will use it to find your matches and statistics.",
  "onboarding.account.reuse.description":
    "The account is personal, but you can use the competition's edition and platform.",
  "onboarding.account.reuse.action": "Use competition details",
  "onboarding.account.identifier.label": "EA identifier",
  "onboarding.account.identifier.placeholder": "e.g. gamer23",
  "onboarding.account.platform.label": "Platform",
  "onboarding.account.identifier.required": "Enter your EA identifier.",
  "onboarding.account.platform.required": "Select this account's platform.",
  "onboarding.account.edition.required": "Select or enter the game edition.",
  "onboarding.account.continue": "Continue",
  "onboarding.account.linkContinue": "Link and continue",
  "onboarding.account.review": "Review account",
  "onboarding.account.linkReview": "Link and review",
  "onboarding.invitation.title": "Join a competition",
  "onboarding.invitation.description":
    "Enter the code you received. We'll use it to join the competition when you confirm.",
  "onboarding.invitation.token.label": "Invitation code",
  "onboarding.invitation.token.placeholder": "Paste the code you received",
  "onboarding.invitation.token.description":
    "We'll check the code before you continue. It won't be saved with your progress.",
  "onboarding.invitation.token.required": "Paste the invitation code to continue.",
  "onboarding.invitation.review": "Review invitation",
  "onboarding.invitation.retry": ({ seconds }) => `Try again in ${seconds}s`,
  "onboarding.invitation.continuePlayer": "Continue as a player",
  "onboarding.club.title": "Link your EA club",
  "onboarding.club.description":
    "The link is optional and declarative. It doesn't verify ownership, create a competition Team, or add you to a roster.",
  "onboarding.club.name.label": "Club name",
  "onboarding.club.name.placeholder": "e.g. Night Owls",
  "onboarding.club.reset": "Reset search",
  "onboarding.club.platform.aria": "EA platform for the search",
  "onboarding.club.search.action": "Search clubs",
  "onboarding.club.search.loading": "Searching…",
  "onboarding.club.search.retry": ({ seconds }) => `Try again in ${seconds}s`,
  "onboarding.club.search.loadingStatus": ({ query }) => `Searching for clubs matching “${query}”…`,
  "onboarding.club.search.empty": ({ query }) => `No clubs matched “${query}”.`,
  "onboarding.club.search.results": (params) =>
    `${count(params)} club${count(params) === 1 ? "" : "s"} found.`,
  "onboarding.club.search.failedStatus": "The search failed. You can try again.",
  "onboarding.club.search.rateLimited": "You reached the temporary search limit.",
  "onboarding.club.search.failed": "We couldn't search for clubs. Try again.",
  "onboarding.club.results.aria": "EA club results",
  "onboarding.club.review": "Review club",
  "onboarding.review.title": "Confirm your setup",
  "onboarding.review.description":
    "Review what we'll save. If you reload or close this page before confirming, you'll need to enter the details again.",
  "onboarding.review.startingAs": "How you'll start",
  "onboarding.review.organization": "Organization",
  "onboarding.review.competition": "Competition",
  "onboarding.review.gameAccount": "Game account",
  "onboarding.review.club": "EA club",
  "onboarding.review.invitationRole": "Competition role",
  "onboarding.review.invitationRole.staff": "Staff",
  "onboarding.review.invitationRole.captain": "Captain",
  "onboarding.review.invitationRole.player": "Player",
  "onboarding.review.invitationExpires": "Valid until",
  "onboarding.review.playerReady": "Player profile ready · Add EA details later",
  "onboarding.review.noClub": "No club linked yet",
  "onboarding.review.edit": ({ label }) => `Edit ${String(label).toLowerCase()}`,
  "onboarding.review.incomplete": "Complete the missing details before confirming.",
  "onboarding.review.retry": ({ seconds }) => `Try again in ${seconds}s`,
  "onboarding.review.finish.organization": "Create organization and competition",
  "onboarding.review.finish.invitation": "Accept invitation",
  "onboarding.review.finish.player": "Enter my personal space",
  "errors.fallback": "We couldn't complete the operation. Try again.",
  "errors.onboarding.organizationCheck": "We couldn't check the name. Try again.",
  "errors.onboarding.saveProgress": "We couldn't save your progress. Try again.",
  "errors.api.rate_limited": "You reached the temporary limit. Wait before trying again.",
  "errors.product_api.unreachable": "We couldn't reach the service. Try again.",
  "errors.product_api.bff_misconfigured": "The service connection isn't configured.",
  "errors.auth.misconfigured": "The authentication service isn't configured.",
  "errors.auth.unavailable": "We couldn't reach the authentication service. Try again.",
  "errors.auth.unhandled": "We couldn't complete sign-in. Try again.",
  "errors.auth.unauthenticated": "You need to sign in to continue.",
  "errors.organizations.invitation_not_found":
    "We couldn't find that invitation. Check the code and try again.",
  "errors.organizations.invitation_expired":
    "The invitation has expired. Ask the organizer for a new one.",
  "errors.organizations.invitation_revoked":
    "The invitation was revoked. Ask the organizer for a new one.",
  "errors.organizations.invitation_invalid": "The invitation is no longer available.",
  "errors.organizations.invitation_exhausted":
    "The invitation has reached its maximum number of uses.",
  "errors.organizations.name_conflict":
    "That organization name is already in use. Go back and choose another one.",
  "errors.organizations.invalid_name": "The organization name isn't valid.",
  "errors.onboarding.invalidCompetition":
    "The competition details aren't valid. Review them and try again.",
  "errors.onboarding.invalidGameAccount":
    "The game account details aren't valid. Review them and try again.",
  "errors.onboarding.createOrganization": "We couldn't create the organization. Try again.",
  "errors.onboarding.completePlayer": "We couldn't save your player profile. Try again.",
  "errors.onboarding.finish": "We couldn't finish your setup. Try again.",
  "player.nav.matches": "My matches",
  "player.nav.statistics": "My statistics",
  "player.nav.gameData": "Game data",
  "player.workspace.eyebrow": "Personal workspace",
  "player.matches.title": "My matches",
  "player.matches.description": "Appearances in the selected club.",
  "player.matches.loading": "Loading your matches…",
  "player.matches.error": "We could not load your matches.",
  "player.matches.emptyTitle": "No official matches yet",
  "player.matches.historyLabel": "Official match history",
  "player.matches.loadMore": "Load more matches",
  "player.matches.loadMore.loading": "Loading more matches…",
  "player.matches.open": "Open My matches",
  "player.matches.view.label": "Match type",
  "player.matches.view.all": "All",
  "player.matches.view.league": "League",
  "player.matches.view.playoff": "Playoff",
  "player.matches.view.friendly": "Friendlies",
  "player.matches.sort.label": "Match order",
  "player.matches.sort.newest": "Newest",
  "player.matches.sort.oldest": "Oldest",
  "player.matches.results.count": ({ count }) => (count === 1 ? "1 match" : `${count} matches`),
  "player.matches.record.wins": "Wins",
  "player.matches.record.draws": "Draws",
  "player.matches.record.losses": "Losses",
  "player.matches.record.label": "Summary of this view",
  "player.matches.record.loading": "Loading the match summary…",
  "player.matches.stats.performance": "Performance",
  "player.matches.stats.record": "Record",
  "player.matches.stats.contributions": "Contributions",
  "player.matches.contributions.composition": ({ goals, assists }) => {
    const goalsCount = Number(goals);
    const assistsCount = Number(assists);
    const goalsLabel = goalsCount === 1 ? "1 goal" : `${goalsCount} goals`;
    const assistsLabel = assistsCount === 1 ? "1 assist" : `${assistsCount} assists`;
    return `${goalsLabel} · ${assistsLabel}`;
  },
  "player.matches.contributions.goalsOnly": ({ count }) =>
    Number(count) === 1 ? "1 goal" : `${Number(count)} goals`,
  "player.matches.contributions.assistsOnly": ({ count }) =>
    Number(count) === 1 ? "1 assist" : `${Number(count)} assists`,
  "player.matches.contributions.contributed": "With G+A",
  "player.matches.contributions.pace": "Per match",
  "player.matches.contributions.share": "Of club goals",
  "player.matches.contributions.contributedValue": ({ contributed, played }) =>
    `${contributed}/${played}`,
  "player.matches.contributions.shareValue": ({ percent }) => `${percent}%`,
  "player.matches.contributions.contributedTooltip": ({ contributed, played, playedCount }) => {
    const matchWord = Number(playedCount) === 1 ? "match" : "matches";
    return `You scored or assisted in ${contributed} of ${played} ${matchWord}. Matches without goal or assist data are not counted.`;
  },
  "player.matches.contributions.contributedTooltip.empty":
    "Matches in which you scored or assisted. There are no matches with goal or assist data.",
  "player.matches.contributions.paceTooltip": ({ rate }) => `Average of ${rate} G+A per match.`,
  "player.matches.contributions.paceTooltip.empty":
    "Average G+A per match. There is no goal or assist data to calculate it.",
  "player.matches.contributions.shareTooltip": ({ percent }) =>
    `You scored ${percent}% of the club's goals. Assists are not included.`,
  "player.matches.contributions.shareTooltip.noClubGoals":
    "Share of the club's goals you scored. The club has no goals in this view.",
  "player.matches.contributions.shareTooltip.unknown":
    "Share of the club's goals you scored. There is no goal data to calculate it.",
  "player.matches.performance.averageRating": "Average rating",
  "player.matches.performance.vsLast": ({ count }) => `vs last ${count}`,
  "player.matches.performance.improved": "Improved",
  "player.matches.performance.declined": "Declined",
  "player.matches.performance.unchanged": "Unchanged",
  "player.matches.performance.trendAria": ({ status, delta, count }) =>
    `${status}. ${delta} vs last ${count}`,
  "player.matches.form.label": "Recent form",
  "player.matches.form.win": ({ score, opponent }) => `Win ${score} against ${opponent}`,
  "player.matches.form.draw": ({ score, opponent }) => `Draw ${score} against ${opponent}`,
  "player.matches.form.loss": ({ score, opponent }) => `Loss ${score} against ${opponent}`,
  "player.matches.form.unknownMatch": ({ home, score, away }) => `${home} ${score} ${away}`,
  "player.matches.form.winShort": "W",
  "player.matches.form.drawShort": "D",
  "player.matches.form.lossShort": "L",
  "player.matches.form.unknownShort": "—",
  "player.matches.day.today": "Today",
  "player.matches.day.yesterday": "Yesterday",
  "player.matches.mvp": "MVP",
  "player.matches.mvp.named": ({ name }) => `${name} MVP`,
  "player.matches.dnf": "Won by DNF",
  "player.matches.notPlayed": "You didn't play",
  "player.matches.openMatch": "View match",
  "player.matches.openMatchLabel": ({ home, homeGoals, awayGoals, away }) =>
    `View ${home} ${homeGoals} – ${awayGoals} ${away}`,
  "player.matchDetail.breadcrumb": "Breadcrumb",
  "player.matchDetail.breadcrumb.match": "Match",
  "player.matchDetail.vs": "vs",
  "player.matchDetail.loading": "Loading rosters…",
  "player.matchDetail.error": "Unable to load the match. Try again.",
  "player.matchDetail.notFound.title": "Match not found",
  "player.matchDetail.notFound.description":
    "This match is not available in your 50 most recent matches.",
  "player.matchDetail.needsClub.title": "Associate a club to view this match",
  "player.matchDetail.needsClub.description":
    "Select or associate a club to find the match in its recent data.",
  "player.matchDetail.needsGameAccount.title": "Add a game account",
  "player.matchDetail.needsGameAccount.description":
    "Add your game identifier so we can recognize whether you played in the match.",
  "player.matchDetail.selectedClub": "Selected club",
  "player.matchDetail.opponent": "Opponent",
  "player.matchDetail.yourMatch": "Your match",
  "player.matchDetail.you": "You",
  "player.matchDetail.roster": "Roster",
  "player.matchDetail.roster.empty": "No player data is available for this roster.",
  "player.matchDetail.tab.summary": "Summary",
  "player.matchDetail.tab.players": "Players",
  "player.matchDetail.tab.facts": "Match details",
  "player.matchDetail.comparison": "Team comparison",
  "player.matchDetail.performance": "Your performance",
  "player.matchDetail.performance.empty.description":
    "You did not line up with the selected club in this match.",
  "player.matchDetail.performance.passAccuracy": "Pass accuracy",
  "player.matchDetail.performance.tackleAccuracy": "Tackle accuracy",
  "player.matchDetail.highlights": "Match highlights",
  "player.matchDetail.highlights.mvp": "MVP",
  "player.matchDetail.highlights.scorer": "Top scorer",
  "player.matchDetail.highlights.playmaker": "Top assister",
  "player.matchDetail.highlights.rival": "Best opponent",
  "player.matchDetail.highlights.empty": "There are no highlights for this match.",
  "player.matchDetail.highlights.passAccuracy": ({ percent }) => `${percent} pass accuracy`,
  "player.matchDetail.highlights.assists": ({ count }) =>
    count === 1 ? "1 assist" : `${count} assists`,
  "player.matchDetail.highlights.shots": ({ count }) => (count === 1 ? "1 shot" : `${count} shots`),
  "player.matchDetail.highlights.tackles": ({ count }) =>
    count === 1 ? "1 tackle" : `${count} tackles`,
  "player.matchDetail.highlights.rating": ({ rating }) => `${rating} rating`,
  "player.matchDetail.minutesPlayed": ({ minutes }) => `${minutes} min`,
  "player.matchDetail.metric.passAccuracy": "Pass accuracy",
  "player.matchDetail.complete": "Complete data",
  "player.matchDetail.partial": "Partial data",
  "player.matchDetail.unknown": "Unknown completeness",
  "player.matchDetail.disconnected": "Disconnected match",
  "player.matchDetail.forfeit": "Won by DNF",
  "player.matchDetail.facts.type": "Type",
  "player.matchDetail.facts.completeness": "Completeness",
  "player.matchDetail.facts.duration": "Duration",
  "player.matchDetail.facts.game": "Game",
  "player.matchDetail.facts.provider": "Provider",
  "player.matchDetail.provider": ({ provider }) => `${provider}`,
  "player.matchDetail.game": ({ edition, platform }) => `${edition} · ${platform}`,
  "player.matchDetail.duration.seconds": ({ seconds }) => `${seconds} s`,
  "player.matchDetail.duration.minutes": ({ minutes }) => `${minutes} min`,
  "player.matchDetail.duration.minutesSeconds": ({ minutes, seconds }) =>
    `${minutes} min ${seconds} s`,
  "player.matchDetail.metric.position": "Position",
  "player.matchDetail.position.goalkeeper": "Goalkeeper",
  "player.matchDetail.position.defender": "Defender",
  "player.matchDetail.position.midfielder": "Midfielder",
  "player.matchDetail.position.forward": "Forward",
  "player.matches.outcome.win": "Win",
  "player.matches.outcome.draw": "Draw",
  "player.matches.outcome.loss": "Lose",
  "player.matches.outcome.unknown": "No result",
  "player.matches.finalized": "Full time",
  "player.matches.vs": "–",
  "player.matches.appearance.goalsUnit": ({ count }) => (count === 1 ? "goal" : "goals"),
  "player.matches.appearance.assistsUnit": ({ count }) => (count === 1 ? "assist" : "assists"),
  "player.matches.recent.title": "Recent",
  "player.matches.recent.loading": "Loading recent matches…",
  "player.matches.recent.error": "We could not load your recent matches.",
  "player.matches.recent.historyLabel": "Recent matches",
  "player.matches.recent.needsClub.title": "Associate a club to see recent matches",
  "player.matches.recent.needsClub.description":
    "Recent matches come from the clubs you associate. Your game identifier only recognizes your appearances.",
  "player.matches.recent.needsGameAccount.title": "Add a game account",
  "player.matches.recent.needsGameAccount.description":
    "Associate a game identifier so your appearances in your clubs' matches can be recognized.",
  "player.matches.recent.emptyTitle": "No recent matches",
  "player.matches.recent.emptyDescription":
    "There are no recent appearances in the selected club yet.",
  "player.matches.all.historyLabel": "All matches",
  "player.matches.all.emptyTitle": "No matches",
  "player.matches.all.emptyDescription": "There are no appearances in the selected club yet.",
  "player.matches.league.historyLabel": "League matches",
  "player.matches.league.emptyTitle": "No league matches",
  "player.matches.league.emptyDescription":
    "There are no league appearances in the selected club yet.",
  "player.matches.playoff.historyLabel": "Playoff matches",
  "player.matches.playoff.emptyTitle": "No playoff matches",
  "player.matches.playoff.emptyDescription":
    "There are no playoff appearances in the selected club yet.",
  "player.matches.friendly.historyLabel": "Friendly matches",
  "player.matches.friendly.emptyTitle": "No friendlies",
  "player.matches.friendly.emptyDescription":
    "There are no friendly appearances in the selected club yet.",
  "player.matches.type.league": "League",
  "player.matches.type.playoff": "Playoff",
  "player.matches.type.friendly": "Friendly",
  "player.matches.metric.yellowCards": "Yellow",
  "player.matches.metric.redCards": "Red",
  "player.matches.feat.hatTrick": "Hat-trick",
  "player.matches.feat.poker": "Poker",
  "player.matches.feat.repoker": "Repoker",
  "player.matches.feat.scorer": ({ name }) => `By ${name}`,
  "player.statistics.title": "Your profile",
  "player.statistics.description":
    "You as a player: ELO, attributes and statistics from every match you have played.",
  "player.statistics.loading": "Loading your profile…",
  "player.statistics.error": "We could not load your profile.",
  "player.statistics.emptyTitle": "No appearances of yours yet",
  "player.statistics.emptyDescription":
    "When you play, this page becomes your player profile: ELO, attributes and evolution.",
  "player.statistics.needsClub.title": "Associate a club to recognise your matches",
  "player.statistics.needsClub.description":
    "Your profile is built from your appearances. An associated club lets us find them.",
  "player.statistics.needsGameAccount.title": "Register your game identifier",
  "player.statistics.needsGameAccount.description":
    "Without a game account we cannot recognise you in matches.",
  "player.statistics.open": "Open your profile",
  "player.statistics.matchesCount": ({ count }) =>
    count === 1 ? "1 match played" : `${count} matches played`,
  "player.statistics.sampleHint": "From your recent appearances (up to 50 matches).",
  "player.statistics.tableLabel": "Player statistics",
  "player.statistics.metric": "Metric",
  "player.statistics.total": "Total",
  "player.statistics.average": "Average",
  "player.statistics.status": "Status",
  "player.statistics.elo": "ELO",
  "player.statistics.elo.hint": ({ count }) =>
    count === 1 ? "1 rated match" : `${count} rated matches`,
  "player.statistics.record": "W–D–L",
  "player.statistics.summary": "Summary",
  "player.statistics.attributes": "Profile by category",
  "player.statistics.evolution": "Evolution",
  "player.statistics.evolution.empty": "Play more matches to see your evolution.",
  "player.statistics.tab.general": "Overall",
  "player.statistics.tab.team": "By team",
  "player.statistics.tab.position": "By position",
  "player.statistics.attribute.attack": "Attack",
  "player.statistics.attribute.pass": "Passing",
  "player.statistics.attribute.defense": "Defense",
  "player.statistics.attribute.impact": "Impact",
  "player.statistics.attribute.discipline": "Discipline",
  "player.statistics.component.goalsPerMatch": "Goals per match",
  "player.statistics.component.shotsPerMatch": "Shots per match",
  "player.statistics.component.shotAccuracy": "Shot conversion",
  "player.statistics.component.offensiveRoleRating": "Offensive rating by role",
  "player.statistics.component.passSuccess": "Pass success %",
  "player.statistics.component.passVolume": "Pass volume",
  "player.statistics.component.tacklesMadePerMatch": "Successful tackles per match",
  "player.statistics.component.tackleSuccess": "Tackle success %",
  "player.statistics.component.defensiveRoleRating": "Rating in defensive positions",
  "player.statistics.component.averageRating": "Average rating",
  "player.statistics.component.winRate": "Win %",
  "player.statistics.component.goalsAssistsPerMatch": "G+A per match",
  "player.statistics.component.fewerRedsPerMatch": "Discipline (fewer reds per match)",
  "player.statistics.component.points": ({ points }) =>
    points === 1 ? "1 point" : `${points} points`,
  "player.statistics.component.confidence": ({ percent }) => `${percent}% confidence`,
  "player.statistics.component.weightedMatches": ({ count }) =>
    count === 1 ? "1 weighted match" : `${count} weighted matches`,
  "player.statistics.team": "Team",
  "player.statistics.position": "Position",
  "player.gameData.review": "Review game data",
  "player.backToWorkspace": "Back to personal workspace",
  "player.retry": "Try again",
  "player.partialData": "Partial data",
  "player.partialData.description":
    "Some metrics were unavailable in one or more matches and are flagged in the table.",
  "player.completeData": "Complete",
  "player.noData": "No data",
  "player.onboarding.checking": "Checking your onboarding…",
  "player.metric.goals": "Goals",
  "player.metric.assists": "Assists",
  "player.metric.goalsPlusAssists": "G+A",
  "player.metric.shots": "Shots",
  "player.metric.passAttempts": "Pass attempts",
  "player.metric.passesMade": "Passes completed",
  "player.metric.tackleAttempts": "Tackle attempts",
  "player.metric.tacklesMade": "Tackles completed",
  "player.metric.saves": "Saves",
  "player.metric.yellowCards": "Yellow cards",
  "player.metric.redCards": "Red cards",
  "player.metric.mvpAwards": "MVP awards",
  "player.metric.rating": "Rating",
  "player.metric.matches": "Matches",
  "player.metric.minutes": "Minutes",
  "player.position.unknown": "Position unavailable",
  "landing.meta.title": "Futrob | From the EA match to the official result",
  "landing.meta.description":
    "Run FC Clubs leagues and cups with real EA data: auditable official-match selection, standings, rankings, and a public portal.",
  "landing.nav.aria": "Access",
  "landing.nav.login": "Log in",
  "landing.nav.signup": "Create account",
  "landing.hero.eyebrow": "FC Clubs competitions",
  "landing.hero.titleLead": "From the EA match to the",
  "landing.hero.titleHighlight": "official result",
  "landing.hero.subtitleLead": "Captains pick the matches that count.",
  "landing.hero.subtitleRest": "You approve the result and Futrob updates the table automatically.",
  "landing.hero.cta.primary": "Create account",
  "landing.hero.cta.secondary": "See how it works",
  "landing.status.approved": "Approved",
  "landing.status.candidate": "EA candidate",
  "landing.status.selecting": "In selection",
  "landing.status.synced": "EA sync",
  "landing.status.scheduled": "Scheduled",
  "landing.matches.title": "The operations table",
  "landing.matches.subtitle":
    "Every encounter shows where its result comes from and what state it is in. Nothing is published without approval.",
  "landing.matches.matchday": "Matchday 4 · Metropolitan League",
  "landing.mechanism.title": "How a match becomes official",
  "landing.mechanism.subtitle": "The same journey for every result, always auditable.",
  "landing.mechanism.sync.title": "EA sync",
  "landing.mechanism.sync.description":
    "Futrob syncs your clubs' matches from EA and stores them as candidates, never as official.",
  "landing.mechanism.selection.title": "Selection",
  "landing.mechanism.selection.description":
    "Captains choose which matches count for the encounter, with a series preview.",
  "landing.mechanism.approval.title": "Approval",
  "landing.mechanism.approval.description":
    "The confirmed result is approved and audited. Sync never auto-officializes.",
  "landing.mechanism.publication.title": "Publication",
  "landing.mechanism.publication.description":
    "Only approved results update the table, bracket, rankings, and public portal.",
  "landing.demo.title": "Try it against the real API",
  "landing.demo.subtitle":
    "Search for your EA Clubs team. It is the same data layer that powers your competitions.",
  "gameData.clubSearch.source": "Results from /api/v1/game-data/clubs/search.",
  "landing.players.title": "For players: your matches, your numbers",
  "landing.players.subtitle":
    "The personal profile exists without an organization: link your EA club and track your performance.",
  "landing.players.matches.title": "My matches",
  "landing.players.matches.description":
    "Recent and all, with league, playoff, or friendly marked on each card.",
  "landing.players.stats.title": "My stats",
  "landing.players.stats.description":
    "Official contribution history: goals, assists, and ratings per match.",
  "landing.players.feats.title": "Marked feats",
  "landing.players.feats.description":
    "Hat-tricks and four- or five-goal hauls are recognized on every appearance.",
  "landing.portal.title": "A public portal worthy of your tournament",
  "landing.portal.subtitle":
    "Publish cover, teams, schedule, results, table, bracket, and rankings — when you decide.",
  "landing.portal.point.teams": "Teams and schedule always up to date",
  "landing.portal.point.results": "Official results and table",
  "landing.portal.point.rankings": "Player and team rankings",
  "landing.cta.title": "Ready to put your competition under control?",
  "landing.cta.subtitle": "Create your organization and publish your first competition today.",
  "landing.cta.primary": "Create account",
  "landing.cta.secondary": "Log in",
  "landing.footer.tagline": "Precise to operate. Clear to compete.",
  "landing.footer.madeBy": "Futrob is made by Davion Software.",
  "landing.footer.legal": "© 2026 Futrob",
};

export const catalogs = { es, en } as const satisfies Record<Locale, Catalog>;
