export const SUPPORTED_LOCALES = ["es", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type TranslationParams = Readonly<Record<string, string | number>>;
export type Message = string | ((params: TranslationParams) => string);

const count = (params: TranslationParams): number => Number(params.count ?? 0);

/** Small counts read better as words in running copy ("los cuatro primeros"). */
const SPANISH_SMALL_NUMBERS: Readonly<Record<number, string>> = {
  2: "dos",
  3: "tres",
  4: "cuatro",
  5: "cinco",
  6: "seis",
  7: "siete",
  8: "ocho",
  9: "nueve",
  10: "diez",
};

const ENGLISH_SMALL_NUMBERS: Readonly<Record<number, string>> = {
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
};

const es = {
  "audit.action.entryRegistered": "Equipo inscrito",
  "audit.action.entryApproved": "Inscripción aprobada",
  "audit.action.entryRejected": "Inscripción rechazada",
  "audit.action.rosterMemberAdded": "Jugador añadido a la plantilla",
  "audit.action.organizationRoleChanged": "Rol de organización cambiado",
  "audit.action.permissionGranted": "Permiso concedido",
  "audit.action.permissionChanged": "Permiso modificado",
  "audit.action.permissionRevoked": "Permiso revocado",
  "audit.action.superuserAssigned": "Superusuario asignado",
  "audit.action.superuserRevoked": "Superusuario revocado",
  "audit.action.integrityReviewRequired": "Revisión de integridad requerida",
  "audit.action.alternativeProposed": "Selección alternativa propuesta",
  "audit.action.reviewStarted": "Revisión iniciada",
  "audit.action.returnedToSelection": "Selección reabierta",
  "audit.action.referenceReuseRejected": "Partido ya utilizado rechazado",
  "audit.action.legacyReviewRequired": "Revisión de selección anterior requerida",
  "audit.action.confirmationExpired": "Confirmación vencida",
  "pages.competition.audit.title": "Auditoría",
  "pages.competition.audit.subtitle": "Decisiones y cambios registrados en esta competición.",
  "audit.action.organizationCreated": "Organización creada",
  "audit.action.competitionCreated": "Competición creada",
  "audit.action.competitionPublished": "Competición publicada",
  "audit.action.teamCreated": "Equipo creado",
  "audit.action.clubConnected": "Club asociado",
  "audit.action.fixtureGenerated": "Fixture generado",
  "audit.action.encounterEdited": "Enfrentamiento modificado",
  "audit.action.teamWithdrawn": "Equipo retirado",
  "audit.action.roundClosed": "Ronda cerrada",
  "audit.action.selectionProposed": "Selección propuesta",
  "audit.action.selectionConfirmed": "Selección confirmada",
  "audit.action.resultApproved": "Resultado aprobado",
  "audit.action.selectionRejected": "Selección rechazada",
  "audit.action.disputeOpened": "Disputa abierta",
  "audit.action.disputeResolved": "Disputa resuelta",
  "audit.action.resultVoided": "Resultado anulado",
  "audit.action.planChanged": "Plan cambiado",
  "audit.action.sanctionImposed": "Sanción impuesta",
  "audit.action.sanctionRevoked": "Sanción revocada",
  "audit.action.syncQueued": "Sincronización solicitada",
  "audit.action.syncCompleted": "Sincronización completada",

  "pages.organization.audit.title": "Auditoría",
  "pages.organization.audit.subtitle": "Quién hizo qué, cuándo y por qué en tu organización.",
  "audit.title": "Auditoría",
  "audit.filter.label": "Filtrar auditoría",
  "audit.filter.competition": "Competición",
  "audit.filter.actor": "Actor",
  "audit.filter.action": "Acción",
  "audit.filter.from": "Desde (UTC)",
  "audit.filter.to": "Hasta (UTC)",
  "audit.filter.rangeError": "La fecha final debe ser igual o posterior a la inicial.",
  "audit.filter.apply": "Aplicar filtros",
  "audit.filter.clear": "Quitar filtros",
  "audit.table.label": "Historial de auditoría",
  "audit.column.date": "Fecha",
  "audit.column.actor": "Actor",
  "audit.column.action": "Acción",
  "audit.column.reason": "Motivo",
  "audit.column.object": "Objeto afectado",
  "audit.systemActor": "Actor no registrado",
  "audit.noReason": "Sin motivo registrado",
  "audit.loading": "Cargando auditoría",
  "audit.loadError": "No pudimos cargar la auditoría.",
  "audit.refreshError": "No pudimos actualizar la auditoría. Ves la última lectura correcta.",
  "audit.denied.title": "Auditoría no disponible",
  "audit.denied.description": "Necesitas permiso para consultar la auditoría de esta organización.",
  "audit.empty.title": "Sin actividad registrada",
  "audit.empty.description":
    "Las decisiones de tu organización y sus competiciones aparecerán aquí.",
  "audit.filteredEmpty.title": "Sin resultados con estos filtros",
  "audit.filteredEmpty.description": "Cambia los filtros o quítalos para consultar el historial.",
  "audit.order": "Más recientes primero",
  "audit.previous": "Anterior",
  "audit.next": "Siguiente",
  "audit.competitionNavigation": "Vistas de la competición",
  "audit.correlation": ({ id }) => `Correlación ${id}`,

  "bracket.documentTitle": "Bracket",
  "bracket.loading": "Cargando el cuadro",
  "bracket.error": "No pudimos cargar el cuadro.",
  "bracket.refreshError": "No pudimos actualizar el cuadro. Ves la última lectura correcta.",
  "bracket.empty.title": "Aún no hay cuadro",
  "bracket.empty.description":
    "Cuando se genere el fixture, verás aquí las eliminatorias de la primera ronda a la final.",
  "bracket.noBracket.title": "Esta competición no tiene eliminatorias",
  "bracket.noBracket.description":
    "Su formato se juega por jornadas. Consulta cada enfrentamiento en el calendario.",
  "bracket.calendarLink": "Ver calendario",
  "bracket.facts": "Resumen de la etapa",
  "bracket.rounds.one": "1 ronda",
  "bracket.rounds.other": ({ count }) => `${count} rondas`,
  "bracket.encounters.one": "1 cruce",
  "bracket.encounters.other": ({ count }) => `${count} cruces`,
  "bracket.byes.one": "1 descanso",
  "bracket.byes.other": ({ count }) => `${count} descansos`,
  "bracket.twoLegs": "Ida y vuelta",
  "bracket.hint": "De izquierda a derecha. Desliza el cuadro o abre la lista por rondas.",
  "bracket.canvasLabel": ({ stage }) => `Cuadro desplazable: ${stage}`,
  "bracket.unlinked.one": "1 plaza no indica de qué cruce llega, así que no tiene línea.",
  "bracket.unlinked.other": ({ count }) =>
    `${count} plazas no indican de qué cruce llegan, así que no tienen línea.`,
  "bracket.node.number": ({ number }) => `Cruce ${number}`,
  "bracket.node.label": ({ away, home, kickoff, number, round, status }) =>
    `${round}, cruce ${number}: ${home} contra ${away}. ${kickoff}. ${status}.`,
  "bracket.node.outsideFilter": "Fuera del filtro.",
  "bracket.status.scheduled": "Programado",
  "bracket.status.pending": "Rival por definir",
  "bracket.status.bye": "Sin rival",
  "bracket.filter.team": "Seguir a un equipo",
  "bracket.filter.allTeams": "Todos los equipos",
  "bracket.filter.summary": ({ shown, total }) =>
    `${shown} de ${total} cruces destacados. El cuadro conserva su estructura.`,
  "bracket.filter.clear": "Quitar filtro",
  "bracket.list.toggle": "Ver eliminatorias en lista",
  "bracket.list.matchup": ({ away, home }) => `${home} vs ${away}`,
  "bracket.list.noneForTeam": "Este equipo no juega cruces de esta ronda.",

  "profile.title": "Mi perfil",
  "profile.description": "Tu identidad en Futrob y tus cuentas de juego.",
  "profile.name": "Nombre visible",
  "profile.email": "Correo de la cuenta",
  "profile.identityHint": "Este correo identifica tu cuenta de acceso.",
  "profile.initialsHint": "Tus iniciales se generan a partir del nombre visible.",
  "profile.save": "Guardar perfil",
  "profile.saved": "Perfil guardado.",
  "profile.error": "No pudimos guardar el perfil. Tus cambios siguen aquí.",
  "profile.loading": "Cargando tu perfil…",
  "profile.loadError": "No pudimos cargar tu cuenta. Vuelve a intentarlo.",
  "profile.games": "Cuentas de juego",
  "profile.gamesEmpty": "Todavía no has añadido una cuenta de juego.",
  "profile.gamesError": "No pudimos cargar tus cuentas de juego.",
  "profile.gameData": "Gestionar datos de juego",
  "profile.statistics": "Ver mis estadísticas",
  "account.retry": "Reintentar",
  "account.saving": "Guardando…",
  "account.close": "Cerrar",
  "settings.title": "Cuenta",
  "settings.description": "Preferencias, seguridad, sesiones y eliminación de tu cuenta.",
  "settings.sections": "Secciones de la cuenta",
  "settings.section.preferences": "Preferencias",
  "settings.section.security": "Seguridad",
  "settings.section.sessions": "Sesiones",
  "settings.section.delete": "Eliminar cuenta",
  "settings.language": "Idioma",
  "settings.languageHint": "Se aplica al elegirlo y se recuerda en este navegador.",
  "settings.sidebarLayout": "Barra lateral",
  "settings.sidebarLayoutHint": "Se aplica al elegirla y se guarda en tu cuenta.",
  "settings.sidebarLayoutNavigation": "Navegación",
  "settings.sidebarLayoutPendingQueue": "Con pendientes",
  "settings.saved": "Guardado.",
  "settings.languageError": "No pudimos cambiar el idioma. Sigue el anterior; vuelve a elegirlo.",
  "settings.sidebarLayoutError":
    "No pudimos guardar la barra lateral. Sigue la anterior; vuelve a elegirla.",
  "settings.email": "Correo",
  "settings.emailCurrent": "Entras con {email}.",
  "settings.emailNew": "Correo nuevo",
  "settings.emailHint":
    "Te enviaremos un enlace al correo nuevo. Hasta que lo abras, sigues entrando con el actual.",
  "settings.emailSubmit": "Cambiar correo",
  "settings.emailSending": "Enviando enlace…",
  "settings.emailSent": "Enlace enviado a {email}. Ábrelo para confirmar el cambio.",
  "settings.emailInvalid": "Escribe un correo válido.",
  "settings.emailUnchanged": "Ese ya es tu correo.",
  "settings.emailUnavailable": "El cambio de correo aún no está disponible. Tu correo no cambió.",
  "settings.emailError": "No pudimos pedir el cambio de correo. Vuelve a intentarlo.",
  "settings.password": "Contraseña",
  "settings.passwordHint": "Al cambiarla se cierran tus otras sesiones.",
  "settings.currentPassword": "Contraseña actual",
  "settings.newPassword": "Nueva contraseña",
  "settings.confirmPassword": "Repetir nueva contraseña",
  "settings.passwordSubmit": "Cambiar contraseña",
  "settings.passwordChanging": "Cambiando contraseña…",
  "settings.passwordChanged": "Contraseña cambiada. Cerramos tus otras sesiones.",
  "settings.passwordInvalid":
    "Completa la contraseña actual y usa una nueva de 8 a 128 caracteres. Ambas contraseñas nuevas deben coincidir.",
  "settings.passwordError":
    "No pudimos cambiar la contraseña. Revisa la contraseña actual e inténtalo de nuevo.",
  "settings.emailNotifications": "Avisos por email",
  "settings.emailNotificationsAll": "Todos los avisos",
  "settings.emailNotificationsCritical": "Solo los que piden una acción",
  "settings.emailNotificationsHint":
    "Las acciones pendientes y las decisiones siempre llegan. Se envían en el idioma elegido.",
  "settings.emailNotificationsUnavailable": "No disponible ahora",
  "settings.emailNotificationsLoading": "Cargando…",
  "settings.emailNotificationsError":
    "No pudimos guardar los avisos por email. Siguen los anteriores; vuelve a elegirlos.",
  "emailUnsubscribe.title": "Avisos por email",
  "emailUnsubscribe.description":
    "Deja de recibir recordatorios y novedades. Las acciones pendientes y las decisiones seguirán llegando.",
  "emailUnsubscribe.confirm": "Dejar de recibirlos",
  "emailUnsubscribe.confirming": "Guardando…",
  "emailUnsubscribe.done":
    "Listo. Ya no recibirás recordatorios ni novedades por email. Puedes volver a activarlos en Configuración.",
  "emailUnsubscribe.invalid": "Este enlace no es válido. Cambia tus avisos en Configuración.",
  "emailUnsubscribe.error": "No pudimos guardar el cambio. Vuelve a intentarlo.",
  "emailUnsubscribe.home": "Ir a Futrob",
  "settings.sessionsHint":
    "Dispositivos con tu cuenta abierta. Al cerrar una sesión deja de valer al momento.",
  "settings.sessionsLoading": "Cargando sesiones…",
  "settings.sessionsError": "No pudimos cargar tus sesiones.",
  "settings.sessionsOnlyThis": "Solo tienes abierta esta sesión.",
  "settings.sessionCurrent": "Esta sesión",
  "settings.sessionActivity": "Inició el {signedIn} · Última actividad: {lastActive}",
  "settings.sessionRevoke": "Cerrar sesión",
  "settings.sessionRevokeLabel": "Cerrar la sesión de {device}",
  "settings.sessionsRevokeOthers": "Cerrar las demás",
  "settings.sessionsRevokeError": "No pudimos cerrar la sesión. Vuelve a intentarlo.",
  "settings.deviceUnknown": "Dispositivo desconocido",
  "settings.deviceApp": "App de Futrob",
  "settings.deviceOn": "{client} en {os}",
  "settings.deleteIntro":
    "La cuenta se elimina 30 días después de pedirlo. Hasta entonces puedes cancelarlo iniciando sesión.",
  "settings.deleteRemovedTitle": "Qué se borra",
  "settings.deleteRemoved":
    "Tu nombre, correo, contraseña y sesiones; tus cuentas de juego y estadísticas personales; tus membresías en organizaciones y en plantillas de competiciones en curso.",
  "settings.deleteKeptTitle": "Qué se conserva",
  "settings.deleteKept":
    "Los resultados oficiales, las estadísticas de competición y la auditoría, sin tu nombre: aparecen como «Cuenta eliminada».",
  "settings.deleteLoading": "Comprobando si puedes eliminar la cuenta…",
  "settings.deleteStatusError": "No pudimos comprobar el estado de tu cuenta.",
  "settings.deleteBlockedTitle": "Antes de eliminar la cuenta",
  "settings.deleteBlockerOrganizer":
    "Eres el único organizador de {organization}. Da el rol de organizador a otra persona o archiva sus competiciones activas.",
  "settings.deleteBlockerCaptain":
    "Eres capitán de {team} en {competition}. Cede la capitanía a otro jugador.",
  "settings.deleteScheduled": "Tu cuenta se eliminará el {date}.",
  "settings.deleteStart": "Eliminar cuenta",
  "settings.deleteConfirmTitle": "¿Eliminar tu cuenta?",
  "settings.deleteConfirmDescription":
    "Cerraremos todas tus sesiones, también esta, y eliminaremos la cuenta el {date}. Escribe tu contraseña para confirmar.",
  "settings.deletePassword": "Contraseña",
  "settings.deleteConfirm": "Eliminar mi cuenta",
  "settings.deleting": "Programando eliminación…",
  "settings.deleteKeep": "Mantener la cuenta",
  "settings.deleteWrongPassword": "La contraseña no coincide. La cuenta sigue activa.",
  "settings.deleteBlocked": "Hay responsabilidades pendientes. Revísalas en esta sección.",
  "settings.deleteError": "No pudimos programar la eliminación. La cuenta sigue activa.",
  "accountDeletion.title": "Tu cuenta se eliminará el {date}",
  "accountDeletion.body":
    "Pediste eliminar tu cuenta. Hasta esa fecha puedes cancelarlo y todo quedará como estaba.",
  "accountDeletion.cancel": "Cancelar eliminación",
  "accountDeletion.cancelling": "Cancelando…",
  "accountDeletion.cancelError": "No pudimos cancelar la eliminación. Vuelve a intentarlo.",
  "accountDeletion.signOut": "Cerrar sesión",
  "profile.manageAccount": "Cambiar correo o contraseña",
  "feedback.title": "Enviar feedback",
  "feedback.description": "Cuéntanos qué mejorarías o qué problema encontraste.",
  "feedback.type": "¿Qué quieres compartir?",
  "feedback.problem": "Un problema",
  "feedback.idea": "Una idea",
  "feedback.message": "Tu mensaje",
  "feedback.placeholder": "Cuéntanos qué ocurrió o qué te gustaría mejorar…",
  "feedback.expected": "¿Qué esperabas que ocurriera?",
  "feedback.optional": "Opcional",
  "feedback.reply": "Pueden contactarme sobre este mensaje",
  "feedback.context": "Incluir la página actual",
  "feedback.contextHint": "Solo se incluye la ruta, sin parámetros de búsqueda ni datos de sesión.",
  "feedback.unavailable":
    "El envío de feedback todavía no está disponible. Tu mensaje no se ha enviado.",
  "feedback.send": "Enviar feedback",

  "pages.organization.plan.title": "Plan y uso",
  "pages.organization.plan.subtitle":
    "Qué incluye el plan de tu organización y cuánto llevas usado este mes.",
  "billing.plan.name.free": "Gratis",
  "billing.plan.name.pro": "Pro",
  "billing.plan.name.league": "Liga",
  "billing.plan.current": "Plan actual",
  "billing.plan.status.default": "Plan por defecto",
  "billing.plan.status.active": "Activo",
  "billing.plan.status.trialing": "Prueba hasta el {date}",
  "billing.plan.status.past_due": "Pago pendiente",
  "billing.plan.status.lapsed": "{plan} terminó; se aplica Gratis",
  "billing.request.hint":
    "Pedir un plan no cobra nada: lo activamos a mano y tu plan cambia cuando lo hacemos.",
  "billing.request.action": "Solicitar {plan}",
  "billing.request.pending":
    "Pediste el plan {plan} el {date}. Lo activaremos a mano; hasta entonces sigues con {current}.",
  "billing.request.cancel": "Cancelar solicitud",
  "billing.request.error": "No pudimos registrar tu solicitud. Inténtalo de nuevo.",
  "billing.request.cancelError": "No pudimos cancelar tu solicitud. Inténtalo de nuevo.",
  "billing.request.staffOnly": "Solo el organizador puede pedir un cambio de plan.",
  "billing.plan.topPlan": "Tienes el plan más completo.",
  "billing.plan.compare": "Ver planes",
  "billing.usage.title": "Uso",
  "billing.usage.description":
    "Los límites solo frenan acciones nuevas. Lo que ya está en marcha termina igual.",
  "billing.usage.activeCompetitions": "Competiciones activas",
  "billing.usage.staffMembers": "Staff",
  "billing.usage.providerSyncJobs": "Sincronizaciones con EA este mes",
  "billing.usage.value": "{used} de {limit}",
  "billing.usage.unlimited": "{used} · sin límite",
  "billing.usage.resets": "Se reinicia el {date}",
  "billing.usage.fairUse": "Uso justo",
  "billing.usage.reached.activeCompetitions":
    "Llegaste al límite de competiciones activas. Finaliza o archiva una para crear otra.",
  "billing.usage.reached.staffMembers":
    "No puedes sumar más staff con este plan. El staff actual conserva su rol.",
  "billing.usage.reached.providerSyncJobs":
    "Usaste las sincronizaciones del mes. Los enfrentamientos en curso se resuelven con los partidos ya sincronizados.",
  "billing.features.title": "Incluido en tu plan",
  "billing.features.included": "Incluido",
  "billing.features.notIncluded": "No incluido",
  "billing.features.formats": "Formatos: {formats}",
  "billing.features.teamsPerCompetition": "Hasta {count} equipos por competición",
  "billing.features.teamsUnlimited": "Equipos por competición sin límite",
  "billing.features.automaticProviderSync": "Sincronización automática con EA",
  "billing.features.performanceRanking": "Ranking de rendimiento 0–100",
  "billing.features.premiumAnalytics": "Analíticas premium de equipo y jugador",
  "billing.features.organizerAnalytics.none": "Analítica de organizador",
  "billing.features.organizerAnalytics.basic": "Analítica de organizador básica",
  "billing.features.organizerAnalytics.full": "Analítica de organizador completa",
  "billing.features.portalBranding.futrob": "Portal público con marca Futrob",
  "billing.features.portalBranding.logo_colors": "Portal público con tu logo y colores",
  "billing.features.portalBranding.advanced": "Portal público con branding avanzado",
  "billing.features.notifications": "Notificaciones: {channels}",
  "billing.channel.web": "web",
  "billing.channel.email": "email",
  "billing.channel.announcements": "anuncios",
  "billing.changes.title": "Cambios de plan",
  "billing.changes.empty": "Todavía no hubo cambios de plan.",
  "billing.changes.change": "Cambio",
  "billing.changes.reason": "Motivo",
  "billing.changes.date": "Fecha",
  "billing.changes.assigned": "{plan} ({status})",
  "billing.changes.from": "{before} → {after}",
  "billing.changes.status.active": "activo",
  "billing.changes.status.trialing": "en prueba",
  "billing.changes.status.past_due": "pago pendiente",
  "billing.changes.status.canceled": "cancelado",
  "billing.loading": "Cargando el plan…",
  "billing.error": "No pudimos cargar el plan.",
  "billing.accessError": "No pudimos comprobar tu acceso al plan.",
  "billing.forbidden.title": "No puedes ver el plan",
  "billing.forbidden.description":
    "Solo el organizador y el staff ven el plan y el uso de la organización.",
  "billing.upsell.action": "Ver plan y uso",
  "teamPerformance.viewStandings": "Ver la tabla",
  "billing.upsell.competitions.plan_limit_reached":
    "Tu plan no admite más competiciones activas. Finaliza o archiva una, o cambia de plan.",
  "billing.upsell.competitions.format_not_in_plan":
    "Tu plan no incluye este formato. Elige liga o eliminación directa, o cambia de plan.",
  "billing.upsell.organizations.staff_limit_reached":
    "Tu plan no admite más staff. Puedes invitar a la persona como miembro.",
  "billing.upsell.game_data.sync_quota_exhausted":
    "Usaste las sincronizaciones con EA de este mes. Los partidos ya sincronizados siguen disponibles.",
  "billing.upsell.statistics.performance_ranking_not_in_plan":
    "El ranking de rendimiento forma parte de Pro y Liga.",
  "billing.upsell.generic": "Tu plan no incluye esta acción.",
  "billing.rankingUpsell.title": "El ranking de rendimiento es de Pro y Liga",
  "billing.rankingUpsell.description":
    "Tu plan actual no lo incluye. La tabla oficial de la competición sigue disponible para todos.",
  "pricing.meta.title": "Precios | Futrob",
  "pricing.meta.description":
    "Planes Gratis, Pro y Liga para organizar competiciones de EA SPORTS FC Clubs.",
  "pricing.title": "Planes para cada competición",
  "pricing.subtitle": "Empieza gratis y sube de plan cuando tu operación crezca.",
  "pricing.unavailable": "No pudimos cargar los planes. Vuelve a intentarlo en unos minutos.",
  "pricing.recommended": "Recomendado",
  "pricing.tagline.free": "Para tu primera competición.",
  "pricing.tagline.pro": "Para organizaciones con varias competiciones.",
  "pricing.tagline.league": "Para operaciones grandes y de varias ligas.",
  "pricing.perMonthUsd": "USD al mes",
  "pricing.competitions": "{count} competiciones activas",
  "pricing.competitionsOne": "1 competición activa",
  "pricing.competitionsUnlimited": "Competiciones activas sin límite",
  "pricing.format": "Formato: {format}",
  "pricing.cta.free": "Empezar gratis",
  "pricing.cta.paid": "Crear cuenta",
  "pricing.note.free": "No necesitas tarjeta.",
  "pricing.note.paid":
    "Empiezas en Gratis, pides {plan} desde tu organización y lo activamos a mano.",
  "pricing.comingSoon": "Próximamente",
  "pricing.perMonth": "{count} sincronizaciones al mes",
  "pricing.fairUse": "{count} sincronizaciones al mes (uso justo)",
  "pricing.staff": "Hasta {count} personas de staff",
  "pricing.staffUnlimited": "Staff sin límite",
  "pricing.integrity.title": "La integridad competitiva no depende del plan",
  "pricing.integrity.subtitle":
    "Todo lo que decide un resultado oficial funciona igual en Gratis, Pro y Liga.",
  "pricing.integrity.listLabel": "Incluido en todos los planes",
  "pricing.integrity.selection": "Selección oficial de partidos",
  "pricing.integrity.confirmation": "Confirmación entre capitanes",
  "pricing.integrity.disputes": "Disputas",
  "pricing.integrity.reschedule": "Reprogramación",
  "pricing.integrity.officialization": "Oficialización de resultados",
  "pricing.integrity.note":
    "Si bajas de plan o agotas el cupo, solo se bloquean las acciones nuevas. Las competiciones en curso terminan igual.",
  "landing.nav.pricing": "Precios",
  "competitions.reschedule.expiryLabel": "Plazo de respuesta de la propuesta (horas)",
  "competitions.reschedule.expiryHelp":
    "De 1 a 72 horas desde cada propuesta. Al vencer, el organizador resuelve la solicitud.",
  "competitions.reschedule.expiryInvalid": "Introduce horas enteras entre 1 y 72.",
  "competitionRules.documentTitle": "Reglamento",
  "competitionRules.loading": "Cargando el reglamento…",
  "competitionRules.error": "No pudimos cargar el reglamento.",
  "competitionRules.refreshError":
    "No pudimos actualizar el reglamento. Puede que lo que ves no esté al día.",
  "competitionRules.forbidden.title": "No tienes acceso al reglamento",
  "competitionRules.forbidden.description":
    "Pide al organizador que te dé acceso a esta competición.",
  "competitionRules.notFound.title": "No encontramos esta competición",
  "competitionRules.notFound.description":
    "Puede que se haya eliminado o que el enlace sea incorrecto.",
  "competitionRules.edit": "Editar reglas",
  "competitionRules.status.draft": "Borrador",
  "competitionRules.status.registration": "Inscripciones abiertas",
  "competitionRules.status.published": "Publicada",
  "competitionRules.status.paused": "En pausa",
  "competitionRules.status.finished": "Finalizada",
  "competitionRules.status.archived": "Archivada",
  "competitionRules.notice.draft":
    "Estas reglas son un borrador y pueden cambiar hasta que se publique la competición.",
  "competitionRules.notice.locked":
    "La estructura de la competición ya no admite cambios, por lo que estas reglas son de solo lectura.",
  "competitionRules.format.title": "Formato",
  "competitionRules.format.label": "Tipo de competición",
  "competitionRules.format.league": "Liga",
  "competitionRules.format.knockout": "Eliminación directa",
  "competitionRules.format.groups-knockout": "Grupos + eliminación",
  "competitionRules.format.league-playoffs": "Liga + playoffs",
  "competitionRules.format.swiss": "Sistema suizo",
  "competitionRules.format.teams": "Equipos",
  "competitionRules.format.teamsRange": "De {min} a {max}",
  "competitionRules.format.teamsAtLeast": "Desde {min}",
  "competitionRules.stage.league": "Liga",
  "competitionRules.stage.groups": "Grupos",
  "competitionRules.stage.knockout": "Eliminación",
  "competitionRules.stage.playoffs": "Playoffs",
  "competitionRules.stage.swiss": "Fase suiza",
  "competitionRules.stage.description": "Reglas de partido de esta etapa.",
  "competitionRules.scoring.title": "Puntuación",
  "competitionRules.scoring.win": "Victoria",
  "competitionRules.scoring.draw": "Empate",
  "competitionRules.scoring.loss": "Derrota",
  "competitionRules.encounter.title": "Enfrentamiento",
  "competitionRules.encounter.matches": "Partidos por cruce",
  "competitionRules.encounter.resolution": "Resolución",
  "competitionRules.encounter.independent": "Cada partido cuenta por separado",
  "competitionRules.encounter.aggregate": "Marcador agregado",
  "competitionRules.value.matches": (params) =>
    count(params) === 1 ? "1 partido" : `${count(params)} partidos`,
  "competitionRules.value.hours": (params) =>
    count(params) === 1 ? "1 hora" : `${count(params)} horas`,
  "competitionRules.value.players": (params) =>
    count(params) === 1 ? "1 jugador" : `${count(params)} jugadores`,
  "competitionRules.reschedule.title": "Reprogramación",
  "competitionRules.reschedule.allowed": "Reprogramaciones",
  "competitionRules.reschedule.allowedYes": "Permitidas",
  "competitionRules.reschedule.allowedNo": "No se permiten reprogramaciones",
  "competitionRules.reschedule.max": "Máximo por equipo",
  "competitionRules.reschedule.unlimited": "Sin límite",
  "competitionRules.reschedule.notice": "Aviso mínimo",
  "competitionRules.reschedule.expiry": "Plazo de respuesta a una propuesta",
  "competitionRules.reschedule.opponent": "Aprobación del rival",
  "competitionRules.reschedule.organizer": "Aprobación del organizador",
  "competitionRules.reschedule.required": "Obligatoria",
  "competitionRules.reschedule.notRequired": "No requerida",
  "competitionRules.roster.title": "Plantilla",
  "competitionRules.roster.max": "Máximo de jugadores",
  "competitionRules.roster.default": "{count} (tope por defecto)",
  "competitionRules.platform.title": "Reglas de la plataforma",
  "competitionRules.platform.description": "Se aplican igual en todas las competiciones.",
  "competitionRules.tiebreaks.title": "Criterios de desempate",
  "competitionRules.tiebreaks.description": "Se aplican en este orden.",
  "competitionRules.tiebreaks.points": "Puntos",
  "competitionRules.tiebreaks.buchholz": "Buchholz",
  "competitionRules.tiebreaks.goalDifference": "Diferencia de goles",
  "competitionRules.tiebreaks.goalsFor": "Goles a favor",
  "competitionRules.awayGoals": "Gol de visitante",
  "competitionRules.awayGoalsOff": "No se aplica",
  "competitionRules.results.title": "Validación de resultados",
  "competitionRules.results.confirmation": "Confirmación del rival",
  "competitionRules.results.window": "Plazo para responder",
  "competitionRules.results.windowValue": "24 horas",
  "competitionRules.results.fallback":
    "Si el rival no responde a tiempo, el resultado pasa a revisión del organizador.",
  "competitionRules.results.officialOnly":
    "Solo un resultado oficial aprobado entra en la clasificación y los rankings.",
  "reschedule.title": "Reprogramaciones",
  "reschedule.description":
    "Consulta las propuestas y resuelve las solicitudes escaladas. El silencio no acepta un cambio.",
  "reschedule.loading": "Cargando reprogramaciones…",
  "reschedule.empty": "Sin solicitudes de reprogramación",
  "reschedule.emptyHelp": "Las solicitudes y sus decisiones aparecerán aquí.",
  "reschedule.forbidden": "No tienes acceso al historial de reprogramaciones.",
  "reschedule.error": "No pudimos cargar las reprogramaciones.",
  "reschedule.refresh": "Actualizar reprogramaciones",
  "reschedule.refreshFailed":
    "No pudimos actualizar el historial. Los datos mostrados pueden haber cambiado.",
  "reschedule.paused": "Actualiza las reprogramaciones para enviar. Tu borrador se conserva.",
  "reschedule.status.open": "En negociación",
  "reschedule.status.accepted": "Horario aplicado por consentimiento",
  "reschedule.status.rejected": "Rechazada",
  "reschedule.status.cancelled": "Cancelada",
  "reschedule.status.expired": "Vencida",
  "reschedule.status.escalated": "Escalada al organizador",
  "reschedule.status.resolved_by_organizer": "Resuelta por el organizador",
  "reschedule.scope.encounter": "Todo el enfrentamiento",
  "reschedule.scope.slot": "Partido {slot}",
  "reschedule.requestedBy": "Solicitada por {team}",
  "reschedule.proposedBy": "Propuesta de {team}",
  "reschedule.proposedStart": "Inicio propuesto",
  "reschedule.deadline": "Plazo de respuesta: {date}",
  "reschedule.summary.encounter": "{team} propone mover todo el enfrentamiento del {from} al {to}.",
  "reschedule.summary.slot": "{team} propone mover el partido {slot} del {from} al {to}.",
  "reschedule.summary.applied.encounter": "Todo el enfrentamiento pasó del {from} al {to}.",
  "reschedule.summary.applied.slot": "El partido {slot} pasó del {from} al {to}.",
  "reschedule.summary.closed.encounter": "{team} propuso mover todo el enfrentamiento al {to}.",
  "reschedule.summary.closed.slot": "{team} propuso mover el partido {slot} al {to}.",
  "reschedule.respondBy": "Responde antes del {date}.",
  "reschedule.history": "Historial de propuestas y decisiones",
  "reschedule.proposal": "Propuesta {number}",
  "reschedule.consent": "Consentimiento de {actor}",
  "reschedule.rejection": "Rechazo de {actor}",
  "reschedule.organizer": "Organizador",
  "reschedule.system": "Sistema",
  "reschedule.expiredAt": "Plazo vencido el {deadline}; escalada procesada el {processed}.",
  "reschedule.resolvedAt": "Resolución registrada el {date} por {actor}.",
  "reschedule.noPermission":
    "Solo un operador con permiso para resolver puede cerrar esta solicitud escalada.",
  "reschedule.resolve": "Resolver solicitud escalada",
  "reschedule.outcome": "Desenlace",
  "reschedule.outcome.schedule_set": "Fijar nueva fecha",
  "reschedule.outcome.schedule_kept": "Conservar horario",
  "reschedule.outcome.walkover_intended": "Registrar intención de walkover",
  "reschedule.keepHelp": "Conserva el horario actual y cierra la solicitud sin consumir cupo.",
  "reschedule.setHelp":
    "Aplica la nueva fecha al alcance solicitado y consume cupo del equipo que abrió la solicitud.",
  "reschedule.walkoverHelp":
    "Solo registra una intención. No crea un resultado oficial ni cambia estadísticas, tabla o bracket.",
  "reschedule.reason": "Motivo de la resolución",
  "reschedule.reasonRequired": "Escribe un motivo para cerrar la solicitud.",
  "reschedule.newStart": "Nueva fecha y hora",
  "reschedule.zone": "Hora de la competición: {zone}",
  "reschedule.dateInvalid": "Introduce una fecha válida en la zona de la competición.",
  "reschedule.winningTeam": "Equipo ganador de la intención",
  "reschedule.winnerRequired": "Elige un equipo ganador para registrar la intención.",
  "reschedule.save": "Guardar resolución",
  "reschedule.saving": "Guardando resolución…",
  "reschedule.success": "Resolución guardada. El historial refleja el cierre.",
  "reschedule.conflict":
    "La solicitud cambió. Se ha actualizado el historial; revisa su estado antes de volver a resolver.",
  "reschedule.currentStart": "Horario actual",
  "reschedule.preview": "Se guardará como",
  "reschedule.create.open": "Solicitar reprogramación",
  "reschedule.create.title": "Nueva solicitud de reprogramación",
  "reschedule.create.team": "Equipo que solicita",
  "reschedule.create.actingAs": "Solicitas en nombre de {team}",
  "reschedule.create.scope": "Qué se mueve",
  "reschedule.create.currentStart": "Ahora: {date}",
  "reschedule.create.reason": "Motivo para el rival",
  "reschedule.create.reasonRequired": "Escribe un motivo para el rival.",
  "reschedule.create.help":
    "El rival debe aceptar antes del plazo. Si no responde, la solicitud pasa al organizador: el silencio no cuenta como aceptación.",
  "reschedule.create.submit": "Enviar solicitud",
  "reschedule.create.sending": "Enviando solicitud…",
  "reschedule.create.success": "Solicitud enviada. El horario no cambia hasta que el rival acepte.",
  "reschedule.create.blocked.permission":
    "Solo el capitán de un equipo de este enfrentamiento puede solicitar una reprogramación.",
  "reschedule.create.blocked.rescheduling_disabled":
    "Esta competición no permite reprogramaciones.",
  "reschedule.create.blocked.limit_reached": "{team} ya usó todas sus reprogramaciones.",
  "reschedule.create.blocked.active_request_exists":
    "Ya hay una solicitud activa que incluye este horario.",
  "reschedule.create.blocked.result_protected":
    "Hay una selección de resultados protegida; su horario no se puede mover.",
  "reschedule.recovery.review":
    "La propuesta cambió. Revisa la propuesta actual antes de responder.",
  "reschedule.recovery.windowClosed":
    "Tu respuesta llegó después del plazo y no se registró. El organizador decide la solicitud.",
  "reschedule.recovery.resultProtected":
    "Hay un resultado aprobado en este horario; ya no se puede mover.",
  "reschedule.recovery.disabled": "Esta competición ya no permite reprogramaciones.",
  "reschedule.recovery.limitReached": "Tu equipo ya usó todas sus reprogramaciones.",
  "reschedule.recovery.permission": "Ya no tienes permiso para esta acción. Actualizamos la lista.",
  "reschedule.recovery.activeRequest":
    "Ya hay una solicitud activa para este horario. Revísala en la lista.",
  "reschedule.recovery.noticeProposed":
    "La nueva fecha no respeta la antelación mínima. Elige una fecha más lejana.",
  "reschedule.recovery.noticeCurrent":
    "El partido está demasiado cerca para reprogramarlo; el horario actual se mantiene.",
  "reschedule.recovery.acceptNotice":
    "La fecha propuesta ya no respeta la antelación mínima. Contrapropón otra fecha o rechaza la propuesta.",
  "reschedule.recovery.acceptPast":
    "La fecha propuesta ya pasó. Contrapropón otra fecha o rechaza la propuesta.",
  "reschedule.recovery.dateRejected": "Elige una fecha futura, distinta del horario actual.",
  "reschedule.recovery.network":
    "No pudimos enviar la acción. Vuelve a intentarlo; no se aplicará dos veces.",
  "reschedule.respondAs": "Respondes como {team}",
  "reschedule.accept.open": "Aceptar",
  "reschedule.accept.title": "Aceptar la propuesta",
  "reschedule.accept.body": "{scope} pasa de {from} a {to}.",
  "reschedule.accept.submit": "Confirmar aceptación",
  "reschedule.accept.sending": "Aceptando…",
  "reschedule.accept.success":
    "Aceptación registrada. El estado de la solicitud indica si el horario ya cambió.",
  "reschedule.reject.open": "Rechazar",
  "reschedule.reject.title": "Rechazar la propuesta",
  "reschedule.reject.body": "Se mantiene el horario actual: {date}.",
  "reschedule.reject.reason": "Motivo (opcional)",
  "reschedule.reject.submit": "Confirmar rechazo",
  "reschedule.reject.sending": "Rechazando…",
  "reschedule.reject.success": "Propuesta rechazada. Se mantiene el horario actual.",
  "reschedule.counter.open": "Contraproponer",
  "reschedule.counter.title": "Contraproponer otra fecha",
  "reschedule.counter.actingAs": "Contrapropones como {team}",
  "reschedule.counter.body": "{team} tendrá que dar su consentimiento de nuevo.",
  "reschedule.counter.reason": "Motivo de la contrapropuesta",
  "reschedule.counter.reasonRequired": "Escribe un motivo para la contrapropuesta.",
  "reschedule.counter.submit": "Enviar contrapropuesta",
  "reschedule.counter.sending": "Enviando contrapropuesta…",
  "reschedule.counter.success": "Contrapropuesta enviada. {team} debe responder antes del plazo.",
  "reschedule.blocked.response_window_closed":
    "El plazo de respuesta venció. La solicitud pasa al organizador; el silencio no cuenta como aceptación.",
  "reschedule.blocked.own_proposal":
    "Tu equipo hizo esta propuesta. Espera la respuesta del rival.",
  "reschedule.blocked.permission":
    "Solo el capitán rival o el organizador pueden responder a esta propuesta.",
  "reschedule.blocked.already_consented": "Ya diste tu consentimiento a esta propuesta.",
  "reschedule.blocked.rescheduling_disabled":
    "La competición no permite reprogramar, así que no puedes aceptar ni contraproponer.",
  "reschedule.blocked.result_protected":
    "Hay un resultado aprobado en este horario, así que no puedes aceptar ni contraproponer.",
  "reschedule.stale":
    "La propuesta cambió mientras respondías. Cancela y revisa la propuesta actual.",
  "errors.scheduling.schedule_change_response_window_closed":
    "El plazo de respuesta venció. El organizador debe resolver la solicitud.",
  "errors.scheduling.schedule_change_not_escalated":
    "La solicitud todavía no está escalada para su resolución.",
  "errors.scheduling.invalid_schedule_change_resolution":
    "Comprueba el desenlace, el motivo y el equipo de la resolución.",
  "errors.scheduling.schedule_change_concurrency_conflict":
    "La solicitud cambió. Actualiza el historial antes de resolver.",
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
  "notFound.title": "No encontramos esta página",
  "notFound.description": "El enlace puede estar mal escrito o la página ya no existe.",
  "notFound.visitor.action": "Volver al inicio",
  "notFound.member.action": "Ir a tu espacio",
  "routeError.title": "Algo no ha ido bien",
  "routeError.description": "Ha ocurrido un fallo inesperado. Puedes reintentar esta página.",
  "legal.nav.aria": "Documentos legales",
  "legal.nav.terms": "Términos de servicio",
  "legal.nav.privacy": "Política de privacidad",
  "legal.nav.refunds": "Reembolsos",
  "legal.related": "Otros documentos",
  "legal.signup.lead": "Al crear una cuenta aceptas los",
  "legal.signup.joiner": " y la ",
  "legal.signup.end": ".",
  "legal.draft.title": "Borrador pendiente de revisión legal",
  "legal.draft.body":
    "Este texto describe cómo funciona Futrob hoy. No es asesoramiento jurídico y puede cambiar antes de publicarse como política definitiva.",
  "legal.updated": ({ date }) => `Última actualización: ${date}`,
  "legal.terms.meta.title": "Términos de servicio",
  "legal.terms.meta.description":
    "Condiciones de uso de Futrob para competiciones de EA SPORTS FC Clubs.",
  "legal.terms.title": "Términos de servicio",
  "legal.terms.description":
    "Reglas de la cuenta, el uso aceptable y cómo Futrob trata los datos de EA.",
  "legal.terms.service.title": "El servicio",
  "legal.terms.service.body":
    "Futrob es un producto de Davion Software para operar competiciones de EA SPORTS FC Clubs. Está disponible en español e inglés. Al crear una cuenta aceptas estas condiciones en el estado en que se publican.",
  "legal.terms.accounts.title": "Cuentas",
  "legal.terms.accounts.body":
    "Necesitas una cuenta con un correo y una contraseña. Eres responsable de lo que hagas con ella. No compartas el acceso ni te hagas pasar por otra persona. Si detectas un uso indebido, avisa al operador.",
  "legal.terms.results.title": "Competiciones y resultados oficiales",
  "legal.terms.results.body":
    "Un partido observado en EA no es oficial en Futrob hasta que un capitán lo selecciona y el resultado se aprueba. La sincronización con EA no oficializa nada. Solo los resultados oficiales aprobados actualizan clasificación, rankings y el portal público.",
  "legal.terms.use.title": "Uso aceptable",
  "legal.terms.use.body":
    "Usa Futrob para organizar y jugar competiciones de forma honesta. No intentes falsear resultados, abusar de invitaciones, atacar el servicio ni usar datos de otros participantes fuera de la competición. El operador puede suspender una cuenta que rompa estas reglas.",
  "legal.terms.ea.title": "Datos de EA",
  "legal.terms.ea.body":
    "Los datos de EA Clubs son observaciones del proveedor. Futrob no pide ni guarda credenciales de EA. EA SPORTS y FC Clubs son marcas de sus titulares; Futrob no está afiliado ni respaldado por EA.",
  "legal.terms.liability.title": "Responsabilidad",
  "legal.terms.liability.body":
    "El servicio se ofrece tal cual, en la medida que permite la ley. Futrob no garantiza que EA esté disponible, que un sync coincida con lo que viste en el juego, ni que una competición termine de una forma concreta. Este apartado es un borrador y no limita derechos que no se puedan limitar.",
  "legal.terms.changes.title": "Cambios",
  "legal.terms.changes.body":
    "Podemos actualizar estos términos cuando cambie el producto. La fecha de la última actualización aparece arriba. Si el cambio es sustancial, lo indicaremos en el producto cuando exista un canal para avisarte.",
  "legal.privacy.meta.title": "Política de privacidad",
  "legal.privacy.meta.description":
    "Qué datos guarda Futrob, cómo usa las observaciones de EA y cómo pedir la baja de la cuenta.",
  "legal.privacy.title": "Política de privacidad",
  "legal.privacy.description":
    "Qué guardamos, para qué y cómo puedes pedir que borremos tu cuenta.",
  "legal.privacy.who.title": "Quiénes somos",
  "legal.privacy.who.body":
    "Futrob lo opera Davion Software. Tratamos los datos para que puedas crear una cuenta, unirte a organizaciones y competiciones, y ver resultados oficiales.",
  "legal.privacy.data.title": "Datos que guardamos",
  "legal.privacy.data.body":
    "Cuenta: nombre, correo y el hash de la contraseña (Better Auth). Perfil del actor, organizaciones, competiciones, equipos y plantillas que creas o a las que te unes, invitaciones, actividad y los planes o cupos asignados a tu organización.",
  "legal.privacy.data.body2":
    "No vendemos estos datos. Los usamos para operar el producto, diagnosticar fallos y cumplir las reglas de la competición que organizas o juegas.",
  "legal.privacy.ea.title": "Datos de EA",
  "legal.privacy.ea.body":
    "Si asocias un club o una cuenta de juego, guardamos los identificadores que declares y las observaciones de partidos que llegan de la API de EA Clubs. Futrob no pide ni almacena usuario o contraseña de EA.",
  "legal.privacy.providers.title": "Proveedores",
  "legal.privacy.providers.body":
    "Cloudflare (web, auth y almacenamiento de archivos), Railway (API de producto y Postgres) y Sentry (diagnóstico de errores en producción). El correo transaccional usará un proveedor de email cuando ese canal esté listo; hoy no enviamos ese correo.",
  "legal.privacy.retention.title": "Conservación",
  "legal.privacy.retention.body":
    "Guardamos los datos mientras la cuenta esté abierta. Algunos registros de competición pueden permanecer si otros participantes aún los necesitan (por ejemplo un resultado oficial). Las copias de seguridad se conservan un tiempo limitado y luego se rotan.",
  "legal.privacy.deletion.title": "Eliminación de la cuenta",
  "legal.privacy.deletion.body":
    "Puedes pedir que borremos tu cuenta desde el perfil cuando esa función esté en el producto. Mientras tanto, pide la baja al operador desde la cuenta o el canal de soporte que publique Futrob.",
  "legal.privacy.deletion.body2":
    "Al borrar el acceso quitamos perfil y datos de cuenta. Conservaremos los registros de competición que otros participantes aún necesiten, como resultados oficiales ya aprobados y plantillas de un equipo que sigue en juego.",
  "legal.privacy.contact.title": "Contacto",
  "legal.privacy.contact.body":
    "Escribe al operador de Futrob (Davion Software) desde la cuenta o el canal de soporte publicado en el producto. No inventes un correo: cuando el canal transaccional exista, lo indicaremos aquí.",
  "legal.refunds.meta.title": "Reembolsos",
  "legal.refunds.meta.description":
    "Futrob no cobra con tarjeta en esta fase. Cómo se tramitará un reembolso cuando existan cargos.",
  "legal.refunds.title": "Reembolsos",
  "legal.refunds.description":
    "No hay cobros automáticos en el producto actual. Esta página existirá para el proveedor de pagos cuando los haya.",
  "legal.refunds.current.title": "Producto actual",
  "legal.refunds.current.body":
    "En esta fase Futrob no cobra con tarjeta ni procesa pagos automáticos. Los planes se asignan a mano. No hay un cargo que reembolsar en el producto público.",
  "legal.refunds.charges.title": "Cuando existan cargos",
  "legal.refunds.charges.body":
    "Si un plan de pago se asigna de forma manual, el operador tramita cualquier devolución. Cuando un proveedor de pagos entre en el producto, esta política describirá plazos y el canal para pedir el reembolso.",
  "legal.refunds.ask.title": "Cómo pedirlo",
  "legal.refunds.ask.body":
    "Contacta al operador de Futrob (Davion Software) desde la cuenta o el canal de soporte publicado. Conserva el identificador de la organización y, si lo hay, el del cargo.",
  "common.edit": "Editar",
  "common.pending": "Pendiente",
  "common.seconds": ({ seconds }) => `${seconds} s`,
  "auth.session.checking": "Verificando tu acceso…",
  "auth.session.checkFailed": "No se pudo verificar tu acceso",
  "auth.session.checkFailedDescription": "Revisa tu conexión e inténtalo de nuevo.",
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
  "shell.queue.label": "Pendientes",
  "shell.nav.loading": "Cargando navegación",
  "shell.queue.expand": "Expandir para ver los pendientes",
  "shell.queue.empty.title": "Nada por ahora",
  "shell.queue.empty.description": "Confirmaciones, invitaciones y desacuerdos aparecen aquí.",
  "shell.queue.loading": "Cargando pendientes",
  "shell.queue.error": "No se pudieron cargar los pendientes",
  "activity.matchDispute.open": "Resolver disputa",
  "activity.matchDispute.closed": "Disputa resuelta",
  "activity.selection.pending": "Confirmar selección",
  "activity.selection.watching": "Selección por confirmar",
  "activity.selection.expired": "Selección sin confirmar a tiempo",
  "activity.selection.closed": "Selección respondida",
  "activity.invitation.pending": "Responder invitación",
  "activity.invitation.watching": "Invitación enviada",
  "activity.invitation.expired": "Invitación vencida",
  "activity.invitation.closed": "Invitación respondida",
  "activity.entryInvitation.pending": "Invitación a una competición",
  "activity.entryInvitation.watching": "Equipo invitado",
  "activity.entryInvitation.expired": "Invitación a competición vencida",
  "activity.entryInvitation.closed": "Invitación a competición respondida",
  "activity.competitionPublished": "Competición publicada",
  "activity.scheduleChange.pending": "Responder reprogramación",
  "activity.scheduleChange.watching": "Reprogramación propuesta",
  "activity.scheduleChange.decide": "Decidir reprogramación",
  "activity.scheduleChange.expired": "Reprogramación sin responder a tiempo",
  "activity.scheduleChange.closed": "Reprogramación respondida",
  "activity.decision.entryApproved": "Inscripción aprobada",
  "activity.decision.entryRejected": "Inscripción rechazada",
  "activity.decision.scheduleSet": "Nueva fecha fijada por el organizador",
  "activity.decision.scheduleKept": "El organizador mantuvo la fecha",
  "activity.decision.walkoverIntended": "El organizador decidió victoria por incomparecencia",
  "activity.decision.sanctionImposed": "El organizador impuso una sanción",
  "activity.decision.sanctionRevoked": "El organizador revocó una sanción",
  "pages.competition.sanctions.title": "Sanciones",
  "pages.competition.sanctions.subtitle":
    "Advertencias, descuentos de puntos, suspensiones y derrotas administrativas de la competición.",
  "sanctions.list.label": "Sanciones de la competición",
  "sanctions.list.loading": "Cargando sanciones",
  "sanctions.list.error": "No pudimos cargar las sanciones.",
  "sanctions.list.empty.title": "Sin sanciones",
  "sanctions.list.empty.description":
    "Cuando sanciones a un equipo o a un jugador aparecerá aquí, con su motivo y quién la impuso.",
  "sanctions.list.notFound.title": "Sanciones no disponibles",
  "sanctions.list.notFound.description":
    "Esta competición no es de esta organización o tu cuenta no puede ver sus sanciones.",
  "sanctions.team.title": "Sanciones",
  "sanctions.team.label": "Sanciones del equipo",
  "sanctions.team.loading": "Cargando las sanciones del equipo",
  "sanctions.team.error": "No pudimos cargar las sanciones del equipo.",
  "sanctions.team.empty": "Tu equipo no tiene sanciones en esta competición.",
  "sanctions.team.forbidden": "No puedes ver las sanciones de este equipo.",
  "sanctions.type.warning": "Advertencia",
  "sanctions.type.pointsDeduction": "Descuento de puntos",
  "sanctions.type.matchSuspension": "Suspensión",
  "sanctions.type.administrativeDefeat": "Derrota administrativa",
  "sanctions.detail.points": ({ count }) => (count === 1 ? "−1 punto" : `−${count} puntos`),
  "sanctions.detail.matches": ({ count }) => (count === 1 ? "1 partido" : `${count} partidos`),
  "sanctions.detail.encounter": "Sobre un partido de la competición",
  "sanctions.target.team": "Equipo",
  "sanctions.target.player": "Jugador",
  "sanctions.target.unnamedTeam": "Equipo sin nombre disponible",
  "sanctions.target.unnamedPlayer": "Jugador sin nombre disponible",
  "sanctions.column.sanction": "Sanción",
  "sanctions.column.target": "Sancionado",
  "sanctions.column.reason": "Motivo",
  "sanctions.column.imposedAt": "Impuesta",
  "sanctions.column.status": "Estado",
  "sanctions.column.actions": "Acciones",
  "sanctions.status.active": "Vigente",
  "sanctions.status.revoked": "Revocada",
  "sanctions.reason": "Motivo",
  "sanctions.reasonRequired": "Escribe un motivo de al menos 3 caracteres.",
  "sanctions.impose.trigger": "Sancionar",
  "sanctions.impose.title": "Nueva sanción",
  "sanctions.impose.description":
    "Queda registrada con tu nombre, el motivo y la fecha. No se puede borrar: solo revocar.",
  "sanctions.impose.target": "A quién",
  "sanctions.impose.type": "Tipo",
  "sanctions.impose.team": "Equipo",
  "sanctions.impose.teamPlaceholder": "Elige un equipo",
  "sanctions.impose.teamsError": "No se pudieron cargar los equipos.",
  "sanctions.impose.playersError": "No se pudo cargar la plantilla del equipo.",
  "sanctions.impose.encountersError": "No se pudieron cargar los partidos del equipo.",
  "sanctions.impose.noTeams": "No hay equipos aprobados",
  "sanctions.impose.teamRequired": "Elige el equipo.",
  "sanctions.impose.player": "Jugador",
  "sanctions.impose.playerPlaceholder": "Elige un jugador",
  "sanctions.impose.playerNeedsTeam": "Elige primero el equipo",
  "sanctions.impose.playerRequired": "Elige el jugador.",
  "sanctions.impose.points": "Puntos a descontar",
  "sanctions.impose.pointsInvalid": "Escribe un número entero entre 1 y 100.",
  "sanctions.impose.matches": "Partidos de suspensión",
  "sanctions.impose.matchesInvalid": "Escribe un número entero entre 1 y 20.",
  "sanctions.impose.encounter": "Partido",
  "sanctions.impose.encounterPlaceholder": "Elige el partido",
  "sanctions.impose.noEncounters": "Este equipo no tiene partidos",
  "sanctions.impose.encounterRequired": "Elige el partido.",
  "sanctions.impose.encounterOption": ({ round, home, away }) =>
    `Jornada ${round}: ${home} vs ${away}`,
  "sanctions.impose.confirm": "Registrar sanción",
  "sanctions.revoke.trigger": "Revocar",
  "sanctions.revoke.title": "Revocar sanción",
  "sanctions.revoke.description": ({ type, target }) =>
    `${type} a ${target}. Seguirá en la lista como revocada, con tu nombre y el motivo.`,
  "sanctions.revoke.confirm": "Revocar sanción",
  "errors.competitions.invalid_sanction": "Revisa los datos de la sanción.",
  "errors.competitions.sanction_target_not_found":
    "El equipo, jugador o partido ya no está en esta competición.",
  "errors.competitions.sanction_not_found": "Esa sanción no existe en esta competición.",
  "errors.competitions.sanction_already_revoked": "Esa sanción ya estaba revocada.",
  "errors.competitions.sanctions_closed":
    "En el estado actual de la competición no se pueden registrar ni revocar sanciones.",
  "errors.competitions.sanction_failed": "No pudimos guardar la sanción. Inténtalo nuevamente.",
  "activity.decision.generic": "Decisión del organizador",
  "activity.competitionEntry.pending": "Revisar inscripción",
  "activity.competitionEntry.watching": "Inscripción pendiente",
  "activity.competitionEntry.closed": "Inscripción de equipo",
  "activity.recent.title": "Actividad reciente",
  "activity.recent.viewAll": "Ver toda la actividad",
  "activity.recent.empty":
    "Todavía no hay actividad. Disputas, confirmaciones, invitaciones y publicaciones aparecerán aquí.",
  "activity.error": "No se pudo cargar la actividad.",
  "activity.page.title": "Actividad",
  "activity.page.description": "Todo lo que pasó en la organización, lo más reciente primero.",
  "activity.personal.description":
    "Tus invitaciones y la actividad de tus equipos, lo más reciente primero.",
  "activity.personal.empty":
    "Aquí verás tus invitaciones y la actividad de los equipos que representas.",
  "activity.page.loadMore": "Cargar más",
  "activity.page.loadingMore": "Cargando más actividad",
  "activity.page.empty.title": "Sin actividad todavía",
  "activity.page.empty.description":
    "Cuando se abra una disputa, se proponga una selección, se envíe una invitación o se publique una competición, aparecerá aquí.",
  "activity.page.forbidden.title": "No puedes ver esta actividad",
  "activity.page.forbidden.description":
    "La actividad de la organización es para quien opera sus competiciones.",
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
  "onboarding.loading.preparing": "Preparando tu cuenta…",
  "onboarding.loading.error": "No se pudo recuperar tu progreso",
  "onboarding.loading.errorDescription": "Revisa tu conexión e inténtalo de nuevo.",
  "onboarding.intention.title": "¿Qué quieres hacer primero?",
  "onboarding.intention.description":
    "Esto nos ayuda a preparar Futrob para lo que quieres hacer primero.",
  "onboarding.intention.aria": "Intención del onboarding",
  "onboarding.intention.organization.label": "Organizar",
  "onboarding.intention.organization.description":
    "Crea tu organización y configura sus competiciones después.",
  "onboarding.intention.invitation.label": "Unirme",
  "onboarding.intention.invitation.description":
    "Entra en una competición con el enlace o el código de tu invitación.",
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
  "onboarding.organization.continue": "Continuar",
  "onboarding.organization.createAccount": "Crea tu cuenta",
  "organizations.create.title": "Crear organización",
  "organizations.create.description": "Crea otro espacio para administrar competiciones y equipos.",
  "organizations.create.name.label": "Nombre de la organización",
  "organizations.create.name.placeholder": "ej. Liga Nocturna",
  "organizations.create.name.description":
    "Es el nombre público de tu organización. Debe ser único.",
  "organizations.create.name.required": "Escribe el nombre de la organización.",
  "organizations.create.name.max": "El nombre debe tener como máximo 120 caracteres.",
  "organizations.create.name.conflict": "Ese nombre ya está en uso. Elige otro.",
  "organizations.create.name.invalid": "El nombre no es válido.",
  "organizations.create.checkFailed": "No pudimos verificar el nombre. Inténtalo nuevamente.",
  "organizations.create.failed": "No pudimos crear la organización. Inténtalo nuevamente.",
  "organizations.create.submit": "Crear organización",
  "organizations.create.submitting": "Creando…",
  "organizations.create.logoFailed":
    "Creamos la organización, pero no pudimos subir el escudo. Puedes subirlo desde Ajustes.",
  "organizations.create.logoRetry": "Reintentar subida",
  "organizations.create.continue": "Continuar sin escudo",
  "organizations.profile.slug.label": "Slug",
  "organizations.profile.slug.description":
    "Identificador único de tu organización: minúsculas, números y guiones.",
  "organizations.profile.slug.invalid":
    "Usa de 3 a 48 caracteres: minúsculas, números y guiones, sin palabras reservadas.",
  "organizations.profile.slug.taken": "Ese slug ya está en uso.",
  "organizations.profile.slug.checkFailed": "No pudimos verificar el slug. Inténtalo nuevamente.",
  "organizations.profile.slug.useSuggestion": ({ slug }) => `Usar «${slug}»`,
  "organizations.profile.timeZone.label": "Zona horaria",
  "organizations.profile.timeZone.placeholder": "Selecciona una zona horaria",
  "organizations.profile.timeZone.description":
    "Es la zona inicial de las competiciones nuevas. No cambia las que ya existen.",
  "organizations.profile.logo.label": "Escudo",
  "organizations.profile.logo.description":
    "PNG, JPEG o WebP de hasta 2 MB. Sin escudo se muestra un monograma.",
  "organizations.profile.logo.upload": "Subir escudo",
  "organizations.profile.logo.change": "Cambiar escudo",
  "organizations.profile.logo.remove": "Quitar escudo",
  "organizations.profile.logo.invalidType": "Usa una imagen PNG, JPEG o WebP.",
  "organizations.profile.logo.tooLarge": "La imagen supera los 2 MB.",
  "organizations.profile.logo.alt": ({ name }) => `Escudo de ${name}`,
  "organizations.settings.title": "Ajustes de la organización",
  "organizations.settings.description": "Nombre, slug, zona horaria y escudo de tu organización.",
  "organizations.settings.loading": "Cargando perfil…",
  "organizations.settings.save": "Guardar cambios",
  "organizations.settings.saving": "Guardando…",
  "organizations.settings.saved": "Cambios guardados.",
  "organizations.settings.readOnly": "Solo quien organiza puede cambiar estos datos.",
  "organizations.settings.loadFailed": "No pudimos cargar el perfil de la organización.",
  "organizations.settings.saveFailed": "No pudimos guardar los cambios. Inténtalo nuevamente.",
  "organizations.settings.logoFailed":
    "Guardamos los cambios, pero no pudimos subir el escudo. Inténtalo nuevamente.",
  "competitions.setup.step": ({ step, total }) => `Paso ${step} de ${total}`,
  "competitions.setup.back": "Anterior",
  "competitions.setup.saveDraft": "Guardar borrador",
  "competitions.setup.saving": "Guardando…",
  "competitions.setup.continue": "Continuar",
  "errors.organizations.slug_conflict": "Ese slug ya está en uso. Elige otro.",
  "errors.organizations.invalid_slug": "El slug no es válido. Usa minúsculas, números y guiones.",
  "errors.organizations.invalid_time_zone": "La zona horaria no es válida.",
  "errors.organizations.invalid_logo": "El escudo no es válido.",
  "errors.organizations.creation_key_conflict":
    "No pudimos reutilizar la solicitud anterior. Revisa los datos e inténtalo de nuevo.",
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
  "onboarding.competition.validation.formatNotInPlan":
    "Ese formato no entra en el plan Gratis. Elige otro para continuar.",
  "onboarding.competition.format.planHint":
    "Tu organización empieza en el plan Gratis. Los formatos marcados como Pro necesitan otro plan.",
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
  "onboarding.account.saveContinue": "Guardar y continuar",
  "onboarding.account.saveReview": "Guardar y revisar",
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
    "Opcional. Solo sirve para mostrarte los partidos recientes de tu club. No verificamos la propiedad.",
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
  "onboarding.review.finish.organization": "Crear organización",
  "onboarding.review.finish.invitation": "Aceptar invitación",
  "onboarding.review.finish.player": "Entrar a mi espacio",
  "errors.fallback": "No pudimos completar la operación. Inténtalo nuevamente.",
  "errors.onboarding.organizationCheck": "No pudimos verificar el nombre. Inténtalo nuevamente.",
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
  "invitations.accept.rateLimited": "Alcanzaste el límite temporal de invitaciones.",
  "errors.organizations.name_conflict":
    "Ese nombre de organización ya está en uso. Vuelve y elige otro.",
  "errors.organizations.invalid_name": "El nombre de la organización no es válido.",
  "errors.onboarding.formatNotInPlan":
    "Tu organización empieza en el plan Gratis, que no incluye ese formato. Vuelve a Competición y elige otro.",
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
  "shell.identity.empty": "Sin organización",
  "shell.identity.loading": "Cargando tu espacio…",
  "player.home.title": "Inicio",
  "player.home.subtitle.loading": "Cargando tu actividad…",
  "player.home.clubAssociationFailed.title": "Tu club quedó sin asociar",
  "player.home.clubAssociationFailed.description":
    "EA no respondió al guardar tu club. Tu perfil ya está listo y puedes añadir el club más tarde.",
  "player.home.clubAssociationFailed.action": "Ir a Clubes EA",
  "player.home.clubAssociationFailed.dismiss": "Cerrar aviso",
  "player.home.subtitle.activity": ({ club }) => `Tu actividad con ${club}`,
  "player.home.cta.matches": "Ver mis partidos",
  "player.home.cta.refreshMatches": "Actualizar partidos",
  "player.home.cta.competitions": "Ver mis competiciones",
  "player.home.cta.exploreCompetitions": "Explorar competiciones",
  "player.home.cta.linkEa": "Registrar identificador",
  "player.home.cta.selectClub": "Seleccionar club",
  "player.home.cta.reviewInvitations": "Revisar invitaciones",
  "player.home.cta.viewCompetition": "Ver competición",
  "player.home.cta.viewHistory": "Ver historial",
  "player.home.cta.retry": "Reintentar",
  "player.home.cta.reviewLink": "Revisar identificador",
  "player.home.error": "No se pudo cargar",
  "player.home.updating": "Actualizando…",
  "player.home.updatedAgo": ({ time }) => `Actualizado ${time}`,
  "player.home.hero.onboarding.title": "Empieza con tus datos de juego",
  "player.home.hero.onboarding.subtitle":
    "Selecciona tu club de EA Clubs y registra tu identificador.",
  "player.home.hero.selectClub.title": "Selecciona un club",
  "player.home.hero.selectClub.subtitle":
    "Elige tu club para ver actividad, partidos y competiciones.",
  "player.home.hero.next.title": "Tu próximo enfrentamiento",
  "player.home.hero.next.emptyTitle": "Sin enfrentamientos programados",
  "player.home.hero.next.emptySubtitle":
    "Tu club ya está en competiciones. Todavía no hay fecha para el próximo enfrentamiento.",
  "player.home.hero.next.round": ({ competition, matchday }) =>
    `${competition} · Jornada ${matchday}`,
  "player.home.hero.next.vs": "VS",
  "player.home.hero.next.pending": "Pendiente de jugar",
  "player.home.hero.jump.title": "Da el salto a la competición",
  "player.home.hero.jump.subtitle": "Tu equipo aún no participa en torneos de Futrob.",
  "player.home.invitations.pendingTitle": "Pendientes",
  "player.home.invitations.emptyTitle": "Sin invitaciones pendientes",
  "player.home.invitations.emptySubtitle": "Cuando un club te invite, podrás responder aquí.",
  "player.home.invitations.pendingCount": ({ count }) =>
    count === 1 ? "1 invitación por responder" : `${count} invitaciones por responder`,
  "player.home.invitations.pendingCaption": "Responde para unirte\ny jugar con otros clubes.",
  "player.home.ea.linkedTitle": "Identificador de juego",
  "player.home.ea.linkedCaption": "Registrado en EA Clubs.",
  "player.home.ea.linkedHint": "Sirve para reconocer tus apariciones.",
  "player.home.ea.unlinkedTitle": "Sin identificador de juego",
  "player.home.ea.unlinkedSubtitle":
    "Registra tu identificador de EA para reconocer tus apariciones.",
  "player.home.stats.matches": "Partidos",
  "player.home.stats.wins": "Victorias",
  "player.home.stats.rating": "Rating",
  "player.home.stats.goalsAssists": "Goles + asistencias",
  "player.home.stats.empty": "Tus estadísticas aparecerán cuando tengas partidos registrados.",
  "player.home.stats.unavailableTitle": "Rendimiento personal no disponible",
  "player.home.stats.unavailableSubtitle":
    "Registra tu identificador de juego para reconocer tu actuación en los partidos.",
  "player.home.lastMatch.title": "Último partido",
  "player.home.lastMatch.viewAll": "Ver todos",
  "player.home.lastMatch.finished": "Finalizado",
  "player.home.lastMatch.didNotPlay": "No jugaste",
  "player.home.lastMatch.emptyTitle": "Todavía no hay partidos registrados",
  "player.home.lastMatch.emptySubtitle": "No hay apariciones tuyas en el club seleccionado.",
  "player.home.lastMatch.onboardingTitle": "Todavía no tienes partidos",
  "player.home.lastMatch.onboardingSubtitle":
    "Cuando juegues tus primeros partidos con tu club,\nlos verás aquí.",
  "player.home.lastMatch.lockedTitle": "Aún no podemos identificar tu actuación en los partidos.",
  "player.home.competitions.title": "Mis competiciones",
  "player.home.competitions.viewAll": "Ver todas",
  "player.home.competitions.emptyTitle": "Sin competiciones por ahora",
  "player.home.competitions.emptySubtitle":
    "Aquí verás los torneos en los que participe tu equipo.",
  "player.home.competitions.onboardingTitle": "Tu equipo aún no participa en competiciones",
  "player.home.competitions.onboardingSubtitle": "Explora torneos y da el salto a la competición.",
  "player.home.competitions.status.registration": "Inscripciones abiertas",
  "player.home.competitions.status.published": "En curso",
  "player.home.competitions.status.draft": "Inscrito",
  "player.home.competitions.status.paused": "Pausada",
  "player.home.competitions.status.finished": "Finalizada",
  "player.home.competitions.status.archived": "Archivada",
  "player.home.competitions.format.league": "Competición oficial",
  "player.home.competitions.format.knockout": "Eliminatoria",
  "player.home.competitions.format.groups-knockout": "Grupos y eliminatoria",
  "player.home.competitions.format.league-playoffs": "Liga y playoffs",
  "player.home.competitions.format.swiss": "Sistema suizo",
  "player.competitions.title": "Mis competiciones",
  "player.competitions.description": "Competiciones en las que participas con un equipo.",
  "player.competitions.loading": "Cargando competiciones…",
  "player.competitions.error":
    "No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.",
  "player.competitions.empty.title": "Tu club aún no participa en competiciones",
  "player.competitions.empty.subtitle":
    "Explora los torneos disponibles y comparte los que te interesen con el capitán de tu club.",
  "player.competitions.empty.otherClub": "¿Buscas otro club?",
  "player.competitions.explore.title": "Explorar competiciones",
  "player.competitions.explore.description":
    "Descubre torneos para seguir y compartir con tu club.",
  "player.competitions.explore.breadcrumb.competitions": "Competiciones",
  "player.competitions.explore.breadcrumb.explore": "Explorar",
  "player.competitions.explore.search.label": "Buscar por nombre",
  "player.competitions.explore.search.placeholder": "Nombre de la competición",
  "player.competitions.explore.status.label": "Estado",
  "player.competitions.explore.status.all": "Todos los estados",
  "player.competitions.explore.status.registration": "Inscripciones abiertas",
  "player.competitions.explore.status.published": "En curso",
  "player.competitions.explore.status.paused": "Pausadas",
  "player.competitions.explore.status.finished": "Finalizadas",
  "player.competitions.explore.format.label": "Formato",
  "player.competitions.explore.format.all": "Todos los formatos",
  "player.competitions.explore.region.label": "Región",
  "player.competitions.explore.region.all": "Todas las regiones",
  "player.competitions.explore.platform.label": "Plataforma",
  "player.competitions.explore.platform.all": "Todas las plataformas",
  "player.competitions.explore.sort.label": "Orden",
  "player.competitions.explore.sort.updated-desc": "Más recientes",
  "player.competitions.explore.sort.name-asc": "Nombre A-Z",
  "player.competitions.explore.count": ({ count }) =>
    count === 1 ? "1 competición" : `${count} competiciones`,
  "player.competitions.explore.loading": "Cargando competiciones…",
  "player.competitions.explore.error":
    "No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.",
  "player.competitions.explore.retry": "Reintentar",
  "player.competitions.explore.empty.filtered.title": "No encontramos competiciones",
  "player.competitions.explore.empty.filtered.subtitle":
    "Prueba con otro nombre o amplía los filtros de búsqueda",
  "player.competitions.explore.empty.filtered.cta": "Limpiar búsqueda y filtros",
  "player.competitions.explore.empty.none.title": "Aún no hay competiciones publicadas",
  "player.competitions.explore.empty.none.subtitle":
    "Cuando un organizador publique un torneo, aparecerá aquí para que puedas verlo y compartirlo.",
  "player.competitions.explore.card.view": "Ver competición",
  "player.competitions.explore.card.share": "Compartir competición",
  "player.competitions.explore.card.shareCopied": "Enlace copiado",
  "player.competitions.explore.card.manage": "Gestionar",
  "player.competitions.explore.card.participating": "Tu equipo participa",
  "player.competitions.explore.card.organizer": ({ name }) => `Organiza ${name}`,
  "player.competitions.explore.card.startsOn": ({ date }) => `Inicio: ${date}`,
  "player.competitions.explore.card.endsOn": ({ date }) => `Fin: ${date}`,
  "player.competitions.explore.card.teamsOf": ({ count, max }) => `${count} de ${max} equipos`,
  "player.competitions.explore.card.teamsFull": ({ count }) => `Cupo completo (${count} equipos)`,
  "player.competitions.explore.card.teams": ({ count }) =>
    count === 1 ? "1 equipo" : `${count} equipos`,
  "player.competitions.explore.more": "Mostrar más",
  "player.competitions.detail.loading": "Cargando competición…",
  "player.competitions.detail.error":
    "No se pudo cargar la competición. Comprueba la conexión e inténtalo de nuevo.",
  "player.competitions.detail.notFound.title": "Competición no disponible",
  "player.competitions.detail.notFound.subtitle":
    "Esta competición no está publicada o ya no se puede consultar.",
  "player.competitions.detail.notFound.cta": "Volver a explorar",
  "player.competitions.detail.meta.format": "Formato",
  "player.competitions.detail.meta.region": "Región",
  "player.competitions.detail.meta.platform": "Plataforma",
  "player.competitions.detail.meta.edition": "Edición",
  "player.competitions.detail.meta.timeZone": "Zona horaria",
  "player.competitions.detail.meta.organizer": "Organizador",
  "player.competitions.detail.meta.teams": "Equipos inscritos",
  "player.competitions.detail.meta.startsOn": "Fechas",
  "player.competitions.detail.share": "Compartir",
  "player.competitions.detail.shareCopied": "Enlace copiado",
  "player.competitions.detail.manage": "Gestionar",
  "player.competitions.apply.title": "Inscribe a tu equipo",
  "player.competitions.apply.description":
    "Crea tu equipo para esta competición. Serás su capitán y el organizador revisará la solicitud.",
  "player.competitions.apply.teamName": "Nombre del equipo",
  "player.competitions.apply.submit": "Enviar solicitud",
  "player.competitions.apply.submitting": "Enviando…",
  "player.competitions.apply.error": "No se pudo enviar la solicitud. Inténtalo de nuevo.",
  "player.competitions.apply.error.closed": "Las inscripciones de esta competición se cerraron.",
  "player.competitions.apply.error.conflict": "Ya formas parte de un equipo en esta competición.",
  "player.competitions.apply.status.pending.title": "Solicitud enviada",
  "player.competitions.apply.status.pending.description": ({ team }) =>
    `${team} espera la revisión del organizador.`,
  "player.competitions.apply.status.approved.title": "Equipo inscrito",
  "player.competitions.apply.status.approved.description": ({ team }) =>
    `${team} ya participa en esta competición.`,
  "player.competitions.apply.status.approved.cta": "Ir a la competición",
  "player.competitions.apply.status.rejected.title": "Solicitud rechazada",
  "player.competitions.apply.status.rejected.description": ({ team }) =>
    `El organizador no aprobó a ${team}.`,
  "player.invitations.title": "Invitaciones",
  "player.invitations.competitions.title": "Invitaciones a competiciones",
  "player.invitations.competitions.description":
    "Al aceptar, nombras tu equipo y quedas como su capitán.",
  "player.invitations.competitions.open": "Ver invitación",
  "player.invitations.description":
    "Revisa las invitaciones que has recibido y elige dónde participar.",
  "player.invitations.redeem": "Canjear un código de invitación",
  "player.invitations.error":
    "No se pudieron cargar las invitaciones. Comprueba la conexión e inténtalo de nuevo.",
  "player.invitations.tab.history": "Historial",
  "player.invitations.empty.title": "No tienes invitaciones pendientes",
  "player.invitations.empty.subtitle":
    "Cuando un capitán te invite a su equipo, podrás revisar la invitación y responder desde aquí.",
  "player.invitations.empty.footer":
    "¿Esperabas una invitación? Confirma con el capitán que la haya enviado a tu cuenta.",
  "player.invitations.history.empty.title": "Sin invitaciones anteriores",
  "player.invitations.history.empty.subtitle":
    "Cuando respondas una invitación, quedará registrada aquí con su resultado.",
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
  "player.matchDetail.yourMatch": "Tu partido",
  "player.matchDetail.you": "Tú",
  "player.matchDetail.roster": "Plantilla",
  "player.matchDetail.rosters": "Plantillas del partido",
  "player.matchDetail.rosters.registered": ({ count }) =>
    count === 1 ? "1 jugador registrado" : `${count} jugadores registrados`,
  "player.matchDetail.rosters.playerCount": ({ count }) =>
    count === 1 ? "1 jugador" : `${count} jugadores`,
  "player.matchDetail.rosters.winner": "Ganador",
  "player.matchDetail.rosters.badge.playmaker": "Playmaker",
  "player.matchDetail.rosters.badge.assister": "Asistente",
  "player.matchDetail.rosters.badge.defender": "Defensor",
  "player.matchDetail.rosters.column.player": "Jugador",
  "player.matchDetail.rosters.column.position": "Pos.",
  "player.matchDetail.rosters.column.rating": "Rating",
  "player.matchDetail.rosters.column.goals": "G",
  "player.matchDetail.rosters.column.assists": "A",
  "player.matchDetail.rosters.column.shots": "Tiros",
  "player.matchDetail.rosters.column.passes": "Pases",
  "player.matchDetail.rosters.column.tackles": "Entradas",
  "player.matchDetail.roster.empty": "No hay datos de jugadores para esta plantilla.",
  "player.matchDetail.tab.summary": "Resumen",
  "player.matchDetail.tab.players": "Jugadores",
  "player.matchDetail.tab.facts": "Datos del partido",
  "player.matchDetail.comparison": "Comparación de equipos",
  "player.matchDetail.performance": "Tu rendimiento",
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
  "player.matchDetail.position.short.goalkeeper": "POR",
  "player.matchDetail.position.short.defender": "DF",
  "player.matchDetail.position.short.midfielder": "MC",
  "player.matchDetail.position.short.forward": "DC",
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
  "player.statistics.title": "Mis estadísticas",
  "player.statistics.description":
    "Tú como jugador: rating, atributos y estadísticas de tus partidos recientes.",
  "player.statistics.loading": "Cargando tus estadísticas…",
  "player.statistics.error": "No pudimos cargar tus estadísticas.",
  "player.competitionStats.emptyTitle": "Aún no hay estadísticas oficiales",
  "player.competitionStats.emptyDescription":
    "Aquí aparecerán tus estadísticas cuando se aprueben resultados oficiales en esta competición.",
  "player.competitionStats.refreshFailed":
    "No pudimos actualizar tus estadísticas. Se muestran las últimas que cargamos.",
  "player.statistics.emptyTitle": "Aún no hay apariciones tuyas",
  "player.statistics.emptyDescription":
    "Solo vemos los últimos 50 partidos que EA tiene ahora. Si no hay apariciones en el rango, prueba otras fechas.",
  "player.statistics.period.label": "Rango de fechas",
  "player.statistics.period.from": "Desde",
  "player.statistics.period.to": "Hasta",
  "player.statistics.period.apply": "Aplicar",
  "player.statistics.period.invalid": "Elige una fecha de inicio anterior o igual a la de fin.",
  "player.statistics.period.summary": ({ from, to }) => `${from} – ${to}`,
  "player.statistics.needsClub.title": "Asocia un club para reconocer tus partidos",
  "player.statistics.needsClub.description":
    "Tu perfil se arma con tus apariciones. Un club asociado nos deja encontrarlas.",
  "player.statistics.needsGameAccount.title": "Registra tu identificador de juego",
  "player.statistics.needsGameAccount.description":
    "Sin cuenta de juego no podemos reconocerte en los partidos.",
  "player.statistics.open": "Abrir tu perfil",
  "player.statistics.matchesCount": ({ count }) => `${count} partidos jugados`,
  "player.statistics.record": "V–E–D",
  "player.statistics.record.hint": ({ percent }) => `${percent} de victorias`,
  "player.statistics.assists.hint": ({ average }) => `${average} por partido`,
  "player.statistics.rating.hint": "Promedio por partido",
  "player.statistics.goals.hint": ({ average }) => `${average} por partido`,
  "player.statistics.summary": "Resumen",
  "player.statistics.identity": "Jugador",
  "player.statistics.attributes": "Atributos",
  "player.statistics.attributes.description": "Elige una categoría para ver el desglose.",
  "player.statistics.attributes.select": "Categorías de atributos",
  "player.statistics.strength": "Punto fuerte",
  "player.statistics.toImprove": "A mejorar",
  "player.statistics.evolution": "Rating por partido",
  "player.statistics.evolution.description": "Cómo ha cambiado de un partido a otro.",
  "player.statistics.evolution.empty": "Aún no hay partidos para trazar tu rating.",
  "player.statistics.evolution.ratingUnavailable": "Estos partidos no incluyen rating.",
  "player.statistics.evolution.listLabel": "Rating por partido",
  "player.statistics.evolution.rating": "Rating",
  "player.statistics.form": "Récord",
  "player.statistics.form.description": "Victorias, empates y derrotas.",
  "player.statistics.form.empty": "Aún no hay partidos para armar tu récord.",
  "player.statistics.form.winShare": ({ percent }) => `${percent} de victorias`,
  "player.statistics.form.winShare.percent": ({ percent }) => String(percent),
  "player.statistics.form.winShare.label": "Victorias",
  "player.statistics.form.lastFive": "Últimos 5 partidos",
  "player.statistics.form.wins": ({ count }) => (count === 1 ? "1 victoria" : `${count} victorias`),
  "player.statistics.form.draws": ({ count }) => (count === 1 ? "1 empate" : `${count} empates`),
  "player.statistics.form.losses": ({ count }) => (count === 1 ? "1 derrota" : `${count} derrotas`),
  "player.statistics.form.unknowns": ({ count }) =>
    count === 1 ? "1 sin resultado" : `${count} sin resultado`,
  "player.statistics.form.listLabel": "Reparto de resultados",
  "player.statistics.outcome.short.win": "V",
  "player.statistics.outcome.short.draw": "E",
  "player.statistics.outcome.short.loss": "D",
  "player.statistics.outcome.short.unknown": "?",
  "player.statistics.attribute.attack": "Ataque",
  "player.statistics.attribute.pass": "Pase",
  "player.statistics.attribute.defense": "Defensa",
  "player.statistics.attribute.impact": "Impacto",
  "player.statistics.attribute.discipline": "Disciplina",
  "player.statistics.component.goalsPerMatch": "Goles por partido",
  "player.statistics.component.shotsPerMatch": "Tiros por partido",
  "player.statistics.component.shotAccuracy": "Acierto de tiro",
  "player.statistics.component.offensiveRoleRating": "Rating ofensivo",
  "player.statistics.component.passSuccess": "Éxito de pase",
  "player.statistics.component.passVolume": "Pases",
  "player.statistics.component.tacklesMadePerMatch": "Entradas con éxito por partido",
  "player.statistics.component.tackleSuccess": "Éxito de entradas",
  "player.statistics.component.defensiveRoleRating": "Rating defensivo",
  "player.statistics.component.averageRating": "Rating promedio",
  "player.statistics.component.winRate": "Tasa de victorias",
  "player.statistics.component.goalsAssistsPerMatch": "G+A por partido",
  "player.statistics.component.fewerRedsPerMatch": "Rojas por partido",
  "player.statistics.component.points": ({ points }) => `${points} puntos`,
  "player.statistics.component.confidence": ({ percent }) => `confianza ${percent}%`,
  "player.statistics.component.weightedMatches": ({ count }) =>
    count === 1 ? "1 pj ponderado" : `${count} pj ponderados`,
  "player.gameData.review": "Revisar datos de juego",
  "player.gameData.refresh": "Actualizar datos",
  "player.gameData.refreshing": "Actualizando…",
  "player.gameData.loading": "Cargando datos de juego…",
  "player.gameData.error": "No se pudieron cargar tus datos de juego.",
  "player.gameData.subtitle.empty":
    "Registra tu identificador para consultar tu actividad de EA Clubs.",
  "player.gameData.subtitle.ready":
    "Gestiona tu identificador de EA y los clubes que usas para consultar tus partidos.",
  "player.gameData.setup.title": "Registra tus datos de juego",
  "player.gameData.setup.subtitle":
    "Selecciona tu plataforma, busca tu club de EA Clubs y registra tu identificador.",
  "player.gameData.setup.cta": "Registra tu identificador",
  "player.gameData.setup.hint":
    "Los partidos y las estadísticas aparecen cuando registres tu identificador.",
  "player.gameData.setup.steps.progress": "Pasos del registro",
  "player.gameData.setup.steps.platform": "Plataforma",
  "player.gameData.setup.steps.club": "Club",
  "player.gameData.setup.steps.identifier": "Identificador",
  "player.gameData.setup.steps.summary": ({ current, label, total }) =>
    `Paso ${current} de ${total} · ${label}`,
  "player.gameData.setup.saveFailed": "No se pudo completar el registro. Inténtalo de nuevo.",
  "player.gameData.identifier.title": "Identificador del jugador",
  "player.gameData.identifier.empty": "Todavía no registraste un identificador de EA.",
  "player.gameData.identifier.edit": "Editar identificador",
  "player.gameData.identifier.editTitle": "Editar identificador",
  "player.gameData.identifier.editDescription":
    "Actualiza tu identificador, plataforma y edición. Los clubes asociados no cambian.",
  "player.gameData.identifier.save": "Guardar cambios",
  "player.gameData.identifier.saveFailed":
    "No se pudieron guardar los cambios. Inténtalo de nuevo.",
  "player.gameData.identifier.conflict":
    "Ya tienes una cuenta con ese identificador, plataforma y edición.",
  "player.gameData.identifier.missing": "Esa cuenta ya no está disponible. Actualiza la página.",
  "player.gameData.platform": "Plataforma",
  "player.gameData.clubs.title": "Clubes añadidos",
  "player.gameData.clubs.subtitle": "Elige el club desde el que consultar tus partidos.",
  "player.gameData.clubs.empty": "Todavía no añadiste un club.",
  "player.gameData.clubs.selected": "Seleccionado",
  "player.gameData.clubs.change": "Cambiar club",
  "player.gameData.clubs.associate": "Añadir otro club",
  "player.gameData.clubs.meta": "Club EA · ID {id}",
  "player.gameData.matches.subtitle":
    "Tus partidos recientes y el historial del club seleccionado.",
  "player.gameData.matches.cta": "Ver mis partidos",
  "player.gameData.statistics.subtitle":
    "Tu rating, atributos y rendimiento en partidos recientes de EA Clubs.",
  "player.gameData.statistics.cta": "Ver mis estadísticas",
  "player.gameData.invitations.title": "Mis invitaciones",
  "player.gameData.invitations.subtitle":
    "Invitaciones de clubes y competiciones pendientes de respuesta.",
  "player.gameData.invitations.cta": "Ver mis invitaciones",
  "pages.organization.teams.title": "Equipos",
  "pages.organization.teams.subtitle":
    "Consulta los equipos de tu organización y las competiciones en las que participan.",
  "org.teams.directory.title": "Directorio de equipos",
  "org.teams.count": ({ count }) => (Number(count) === 1 ? "1 equipo" : `${count} equipos`),
  "org.teams.countFiltered": ({ shown, total }) => `${shown} de ${total} equipos`,
  "org.teams.search": "Buscar equipo por nombre",
  "org.teams.table.team": "Equipo",
  "org.teams.table.competitions": "Competiciones",
  "org.teams.created": "Creado el {date}",
  "org.teams.entry.approved": "Aprobado",
  "org.teams.entry.pending": "Pendiente",
  "org.teams.entry.rejected": "Rechazado",
  "org.teams.link": "{competition}: ver {team}",
  "org.teams.noCompetitions": "Sin competiciones",
  "org.teams.competitionsUnavailable": "No disponible",
  "org.teams.loading": "Cargando equipos…",
  "org.teams.error": "No pudimos cargar los equipos de la organización.",
  "org.teams.refreshFailed": "No pudimos actualizar los equipos. Se muestran los datos anteriores.",
  "org.teams.partial":
    "No pudimos cargar las competiciones de todos los equipos. Algunas filas pueden estar incompletas.",
  "org.teams.partialForbidden":
    "No tienes acceso a las competiciones de algunos equipos, por eso esas filas no están disponibles.",
  "org.teams.forbidden.title": "No tienes acceso a los equipos",
  "org.teams.forbidden.description":
    "Tu rol en esta organización no incluye consultar su directorio de equipos.",
  "org.teams.forbidden.cta": "Volver al inicio de la organización",
  "org.teams.empty.title": "Todavía no hay equipos",
  "org.teams.empty.description":
    "Los equipos aparecen aquí cuando se inscriben en una competición de tu organización.",
  "org.teams.empty.cta": "Ver competiciones",
  "org.teams.noMatches.title": "Ningún equipo coincide",
  "org.teams.noMatches.description":
    "No encontramos equipos con «{query}». Prueba con otro nombre.",
  "org.teams.noMatches.clear": "Limpiar búsqueda",
  "pages.organization.players.title": "Jugadores",
  "pages.organization.players.subtitle": "Quién juega en cada plantilla de tu organización.",
  "pages.organization.invitations.title": "Invitaciones",
  "pages.organization.invitations.subtitle":
    "Invitaciones enviadas a staff y miembros de tu organización, con su estado.",
  "pages.organization.members.title": "Miembros y roles",
  "pages.organization.members.subtitle": "Administra los miembros y sus accesos autorizados",
  "organizations.members.invite": "Invitar miembro",
  "organizations.members.inviteDescription":
    "Elige su rol y genera un enlace para que se una a tu organización.",
  "organizations.members.role": "Rol en la organización",
  "organizations.members.memberHint":
    "Acceso básico a la organización. No concede acceso a todas sus competiciones.",
  "organizations.members.staffHint":
    "Puede operar las competiciones y gestionar invitaciones de la organización.",
  "organizations.members.createLink": "Generar enlace",
  "organizations.members.creating": "Generando enlace…",
  "organizations.members.inviteFailed": "No pudimos crear la invitación. Inténtalo nuevamente.",
  "organizations.members.inviteCreated": "Invitación creada",
  "organizations.members.inviteLink": "Enlace de invitación",
  "organizations.members.inviteLinkHint":
    "Comparte este enlace con la persona que quieres invitar. Solo se puede usar una vez.",
  "organizations.members.copy": "Copiar enlace",
  "organizations.members.copied": "Enlace copiado",
  "organizations.members.done": "Listo",
  "organizations.members.list.title": "Miembros",
  "organizations.members.list.description":
    "Consulta los miembros de la organización y sus accesos.",
  "organizations.members.list.loading": "Cargando miembros…",
  "organizations.members.list.error": "No se pudo cargar el listado de miembros.",
  "organizations.members.list.denied":
    "No tienes permiso para consultar los miembros de esta organización.",
  "organizations.members.list.unavailableTitle": "Listado no disponible",
  "organizations.members.list.unavailable":
    "Este espacio mostrará los miembros de la organización, sus roles y sus accesos.",
  "organizations.members.list.emptyTitle": "No hay miembros para mostrar",
  "organizations.members.list.empty": "Los miembros aparecerán aquí cuando acepten una invitación.",
  "organizations.members.list.noMatches": "No hay coincidencias",
  "organizations.members.list.noMatchesHint":
    "Prueba otro rol o limpia los filtros para ver todos los miembros.",
  "organizations.members.list.noMatchesFor":
    "Ningún miembro coincide con «{query}». Cambia la búsqueda o limpia los filtros.",
  "organizations.members.search": "Buscar miembros",
  "organizations.members.roleFilter": "Rol",
  "organizations.members.allRoles": "Todos los roles",
  "organizations.members.member": "Miembro",
  "organizations.members.competitionAccess": "Accesos a competiciones",
  "organizations.members.unknownName": "Miembro sin nombre",
  "organizations.members.accessDenied": "Sin permiso de lectura",
  "organizations.members.authorizedAccess": "Acceso autorizado",
  "organizations.members.restrictedAccess": "Acceso heredado con restricciones",
  "organizations.members.noVisibleCompetitions": "No hay competiciones visibles para mostrar",
  "organizations.members.allCompetitions": "Todas las competiciones",
  "organizations.members.noCompetitions": "Sin accesos asignados",
  "organizations.members.actions": "Acciones",
  "organizations.members.actionsFor": "Acciones de {name}",
  "organizations.members.viewDetails": "Ver detalle",
  "organizations.members.clearFilters": "Limpiar filtros",
  "organizations.members.organizerHint":
    "Control total de la organización: miembros, roles, permisos y competiciones.",
  "organizations.members.roleEditor.label": "Cambiar rol",
  "organizations.members.roleEditor.save": "Guardar rol",
  "organizations.members.roleEditor.saving": "Guardando rol…",
  "organizations.members.roleEditor.saved": "Rol actualizado",
  "organizations.members.roleEditor.lastOrganizer":
    "La organización necesita al menos un organizador. Asigna otro antes de cambiar este rol.",
  "organizations.members.roleEditor.forbidden":
    "No tienes autoridad para asignar o retirar este rol.",
  "organizations.members.roleEditor.failed": "No pudimos cambiar el rol. Inténtalo nuevamente.",
  "organizations.members.grants.title": "Permisos específicos",
  "organizations.members.grants.loading": "Cargando permisos específicos…",
  "organizations.members.grants.empty":
    "Sin permisos específicos: sus accesos dependen solo de su rol.",
  "organizations.members.grants.failed": "No pudimos cargar los permisos específicos.",
  "organizations.members.grants.retry": "Reintentar",
  "organizations.members.grants.allow": "Permitido",
  "organizations.members.grants.deny": "Denegado",
  "organizations.members.detail.title": "Detalle del miembro",
  "organizations.members.detail.description": "Datos del miembro y alcance de sus accesos.",
  "organizations.members.detail.emptyTitle": "Selecciona un miembro",
  "organizations.members.detail.empty":
    "Elige una fila del listado para consultar su rol y sus accesos.",
  "organizations.members.emailUnavailable": "Correo no disponible",
  "organizations.members.joinedAt": "Miembro desde",
  "organizations.members.dateUnavailable": "Fecha no disponible",
  "organizations.members.changes.title": "Cambios recientes",
  "organizations.members.changes.description": "Últimos cambios de miembros, roles y accesos.",
  "organizations.members.changes.change": "Cambio",
  "organizations.members.changes.performedBy": "Realizado por",
  "organizations.members.changes.date": "Fecha",
  "organizations.members.changes.loading": "Cargando cambios recientes…",
  "organizations.members.changes.error": "No se pudieron cargar los cambios recientes.",
  "organizations.members.changes.denied":
    "No tienes permiso para consultar el historial de cambios de esta organización.",
  "organizations.members.changes.unavailableTitle": "Historial no disponible",
  "organizations.members.changes.unavailable":
    "Este espacio mostrará los cambios de miembros, roles y accesos.",
  "organizations.members.changes.emptyTitle": "Sin cambios recientes",
  "organizations.members.changes.empty":
    "Los cambios en miembros, roles y accesos se registrarán aquí.",
  "organizations.members.deniedTitle": "Acceso restringido",
  "organizations.members.refreshing": "Actualizando…",
  "organizations.members.refreshFailed":
    "No se pudo actualizar esta sección. Se muestran los últimos datos disponibles.",
  "organizations.members.copyFailed":
    "No pudimos copiar el enlace. Puedes seleccionarlo y copiarlo manualmente.",
  "pages.organization.settings.title": "Ajustes",
  "pages.organization.settings.subtitle": "Nombre y preferencias de tu organización.",
  "org.home.description": "Vista general de tu organización",
  "org.home.createCompetition": "Crear competición",
  "org.home.summary": "Resumen",
  "org.home.kpi.active": "Competiciones activas",
  "org.home.kpi.teams": "Equipos",
  "org.home.kpi.drafts": "Borradores",
  "org.home.empty.title": "Tu organización empieza aquí",
  "org.home.empty.description": "Crea tu primera competición para organizar equipos y encuentros.",
  "org.home.competitions": "Competiciones",
  "org.home.competitions.viewAll": "Ver todas",
  "org.home.table.name": "Nombre",
  "org.home.table.status": "Estado",
  "org.home.table.teams": "Equipos",
  "org.home.table.start": "Inicio",
  "org.home.table.actions": "Acciones",
  "org.home.table.noStart": "Sin fecha",
  "org.home.actions.menu": ({ name }) => `Acciones de ${name}`,
  "org.home.actions.open": "Abrir",
  "org.home.actions.configure": "Configurar",
  "org.home.actions.teams": "Ver equipos",
  "org.home.activity": "Actividad reciente",
  "org.home.activity.empty": "Aún no hay actividad reciente.",
  "org.home.activity.team": ({ time }) => `Equipo registrado · ${time}`,
  "org.home.activity.competition": ({ status, time }) => `${status} · ${time}`,
  "org.home.status.draft": "Borrador",
  "org.home.status.registration": "Inscripciones abiertas",
  "org.home.status.published": "Publicada",
  "org.home.status.paused": "Pausada",
  "org.home.status.finished": "Finalizada",
  "org.home.status.archived": "Archivada",
  "org.home.error.competitions":
    "No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.",
  "org.home.error.profile": "No se pudo cargar el nombre de la organización.",
  "pages.competition.fixture.title": "Calendario",
  "pages.competition.fixture.subtitle": "Jornadas y fechas de cada enfrentamiento.",
  "pages.competition.encounters.title": "Enfrentamientos",
  "pages.competition.encounters.subtitle": "Estado y resultado de cada cruce entre dos equipos.",
  "pages.competition.standings.title": "Clasificación",
  "pages.competition.standings.subtitle": "Tabla oficial, calculada solo con resultados aprobados.",
  "pages.competition.bracket.title": "Bracket",
  "pages.competition.bracket.subtitle": "Cuadro de eliminatorias, de la primera ronda a la final.",
  "pages.competition.rankings.title": "Rankings",
  "pages.competition.rankings.subtitle":
    "Mejores jugadores según las estadísticas de partidos oficiales aprobados.",
  "competition.rankings.kinds": "Tipo de ranking",
  "competition.rankings.kind.scorer": "Goleadores",
  "competition.rankings.kind.assister": "Asistencias",
  "competition.rankings.kind.rating": "Rating",
  "competition.rankings.kind.mvp": "MVP",
  "competition.rankings.kind.goalkeeper": "Porteros",
  "competition.rankings.table.scorer": "Ranking de goleadores",
  "competition.rankings.table.assister": "Ranking de asistencias",
  "competition.rankings.table.rating": "Ranking de rating medio",
  "competition.rankings.table.mvp": "Ranking de premios MVP",
  "competition.rankings.table.goalkeeper": "Ranking de porteros",
  "competition.rankings.metric.scorer": "Goles",
  "competition.rankings.metric.assister": "Asistencias",
  "competition.rankings.metric.rating": "Rating medio",
  "competition.rankings.metric.mvp": "Premios MVP",
  "competition.rankings.metric.goalkeeper": "Paradas",
  "competition.rankings.criterion.scorer": "Más goles en partidos oficiales aprobados.",
  "competition.rankings.criterion.assister": "Más asistencias en partidos oficiales aprobados.",
  "competition.rankings.criterion.rating":
    "Mejor rating medio de EA en partidos oficiales aprobados.",
  "competition.rankings.criterion.mvp": "Más premios MVP en partidos oficiales aprobados.",
  "competition.rankings.criterion.goalkeeper":
    "Más paradas jugando de portero; si empatan, menos goles encajados.",
  "competition.rankings.meta.criterion": "Criterio",
  "competition.rankings.meta.eligibility": "Elegibilidad",
  "competition.rankings.meta.updated": "Actualizado",
  "competition.rankings.eligibility": ({ matches, percent }) =>
    `Al menos ${matches} ${Number(matches) === 1 ? "partido" : "partidos"} o el ${percent} de los minutos de su equipo.`,
  "competition.rankings.column.position": "Pos.",
  "competition.rankings.column.positionTitle": "Posición",
  "competition.rankings.column.player": "Jugador",
  "competition.rankings.column.matches": "PJ",
  "competition.rankings.column.matchesTitle": "Partidos jugados",
  "competition.rankings.column.minutes": "Min",
  "competition.rankings.column.minutesTitle": "Minutos jugados",
  "competition.rankings.player.unnamed": "Jugador sin nombre visible",
  "competition.rankings.team.none": "Sin equipo",
  "competition.rankings.team.unnamed": "Equipo sin nombre visible",
  "competition.rankings.names.loading": "Cargando nombre",
  "competition.rankings.names.error": "No pudimos cargar los nombres de jugadores y equipos.",
  "competition.rankings.names.restricted":
    "Tu acceso no incluye las plantillas, así que no mostramos nombres de jugadores ni equipos.",
  "competition.rankings.names.partiallyRestricted":
    "Tu acceso no incluye algunas plantillas, así que no mostramos los nombres de esos equipos ni de sus jugadores.",
  "competition.rankings.loading": "Cargando rankings…",
  "competition.rankings.error": "No pudimos cargar los rankings.",
  "competition.rankings.refreshError":
    "No pudimos actualizar los rankings. Mostramos los últimos datos cargados.",
  "competition.rankings.notComputed.title": "Aún no hay rankings",
  "competition.rankings.notComputed.description":
    "Se calculan a partir de los resultados oficiales aprobados de la competición.",
  "competition.rankings.empty.title": "Nadie entra todavía en este ranking",
  "competition.rankings.empty.description":
    "Aparecerán los jugadores que cumplan la elegibilidad y sumen en esta métrica.",
  "competition.rankings.forbidden.title": "No tienes acceso a los rankings",
  "competition.rankings.forbidden.description":
    "Tu rol en esta competición no incluye las estadísticas de jugadores.",
  "competition.rankings.forbidden.back": "Volver a la competición",
  "competition.rankings.notFound.title": "Competición no disponible",
  "competition.rankings.notFound.description":
    "No encontramos esta competición o ya no tienes acceso.",
  "pages.competition.disputes.title": "Disputas",
  "pages.competition.disputes.subtitle":
    "Selecciones en disputa o en revisión del organizador que esperan tu decisión.",
  "pages.competition.analytics.title": "Analíticas",
  "pages.competition.analytics.subtitle": "Participación y actividad de la competición.",
  "pages.competition.teamPerformance.title": "Rendimiento de equipos",
  "pages.competition.teamPerformance.subtitle":
    "Puntuación de 0 a 100 calculada solo con resultados oficiales aprobados. No sustituye a la clasificación.",
  "teamPerformance.loading": "Cargando ranking de rendimiento",
  "teamPerformance.error": "No pudimos cargar el ranking de rendimiento.",
  "teamPerformance.refreshError":
    "No pudimos actualizar el ranking. Se muestran los últimos datos cargados.",
  "teamPerformance.accessError": "No pudimos comprobar tu acceso a las estadísticas.",
  "teamPerformance.forbidden.title": "No tienes acceso a este ranking",
  "teamPerformance.forbidden.description":
    "Tu rol no permite consultar las estadísticas de esta competición.",
  "teamPerformance.backToCompetition": "Volver a la competición",
  "teamPerformance.notBuilt.title": "Aún no hay ranking de rendimiento",
  "teamPerformance.notBuilt.description":
    "Se calcula al aprobar resultados oficiales. Los partidos EA sin aprobar no cuentan.",
  "teamPerformance.notBuilt.action": "Ver enfrentamientos",
  "teamPerformance.empty.title": "Sin equipos en el ranking",
  "teamPerformance.empty.description":
    "Aparecerán los equipos aprobados en la competición y los que tengan resultados oficiales.",
  "teamPerformance.projectionIncomplete.title": "Ranking pendiente de reconstrucción",
  "teamPerformance.projectionIncomplete.description":
    "Hay resultados oficiales que aún no están proyectados por completo. Ningún equipo recibe puntuación hasta reconstruir el ranking.",
  "teamPerformance.unmatched": ({ count }) =>
    count === 1
      ? "1 aportación estadística no coincide con el resultado oficial vigente y no cuenta."
      : `${count} aportaciones estadísticas no coinciden con el resultado oficial vigente y no cuentan.`,
  "teamPerformance.criteria.title": "Criterio",
  "teamPerformance.criteria.description":
    "La puntuación es la suma ponderada de cinco componentes de 0 a 100. Si falta alguno, el equipo queda sin puntuación: no se rellena con cero ni se reparten los pesos.",
  "teamPerformance.criteria.window": "Ventana",
  "teamPerformance.criteria.windowValue": ({ recent }) =>
    `Toda la competición · forma de los últimos ${recent} enfrentamientos`,
  "teamPerformance.criteria.eligibility": "Elegibilidad",
  "teamPerformance.criteria.eligibilityValue": ({ minimum }) =>
    `Al menos ${minimum} enfrentamientos oficiales y los cinco componentes disponibles`,
  "teamPerformance.criteria.period": "Periodo",
  "teamPerformance.criteria.noPeriod": "Sin resultados oficiales",
  "teamPerformance.criteria.updated": "Actualizado",
  "teamPerformance.criteria.sources": "Resultados oficiales",
  "teamPerformance.criteria.sourcesValue": ({ approved, voided }) =>
    voided === 0
      ? `${approved} aprobados`
      : `${approved} aprobados · ${voided} anulados (no cuentan)`,
  "teamPerformance.criteria.versions": ({ formula, normalization, window }) =>
    `Versiones: ${formula} · ${normalization} · ${window}`,
  "teamPerformance.weights.label": "Pesos de la fórmula",
  "teamPerformance.weight": ({ weight }) => `${weight} %`,
  "teamPerformance.table.title": "Ranking",
  "teamPerformance.table.summary": ({ scored, incomplete }) =>
    `${scored} con puntuación · ${incomplete} sin puntuación`,
  "teamPerformance.table.position": "Pos.",
  "teamPerformance.table.team": "Equipo",
  "teamPerformance.table.score": "Puntuación",
  "teamPerformance.table.encounters": "Enfrentamientos",
  "teamPerformance.table.coverage": "Cobertura",
  "teamPerformance.table.noValue": "Sin dato",
  "teamPerformance.table.unranked": "Sin puntuación",
  "teamPerformance.table.scrollHint": "Desliza la tabla para ver todos los componentes.",
  "teamPerformance.team.unknown": "Equipo no disponible",
  "teamPerformance.teamsUnavailable":
    "No pudimos cargar los nombres de los equipos. El ranking sigue siendo válido.",
  "teamPerformance.metric.results": "Resultados",
  "teamPerformance.metric.goalDifference": "Diferencia de goles",
  "teamPerformance.metric.recentForm": "Forma reciente",
  "teamPerformance.metric.offensiveEfficiency": "Eficiencia ofensiva",
  "teamPerformance.metric.defensiveEfficiency": "Eficiencia defensiva",
  "teamPerformance.reason.complete": "Completo",
  "teamPerformance.reason.no_data": "Sin partidos oficiales",
  "teamPerformance.reason.insufficient_sample": ({ count, minimum }) =>
    `Muestra insuficiente: ${count} de ${minimum} enfrentamientos`,
  "teamPerformance.reason.missing_components": "Faltan componentes",
  "teamPerformance.reason.projection_incomplete": "Proyección incompleta",
  "teamPerformance.missing": ({ metrics }) => `Falta: ${metrics}`,
  "teamPerformance.standingsLink": "Ver clasificación oficial",
  "pages.competition.rules.title": "Reglamento",
  "pages.competition.rules.subtitle":
    "Formato, criterios de desempate y reglas de reprogramación vigentes.",
  "pages.competitionPlayer.matches.title": "Partidos",
  "pages.competitionPlayer.matches.subtitle":
    "Tus partidos en esta competición: próximos y jugados.",
  "pages.competitionPlayer.stats.title": "Estadísticas",
  "pages.competitionPlayer.stats.subtitle": "Tus estadísticas oficiales en esta competición.",
  "pages.competitionPlayer.team.title": "Mi equipo",
  "pages.competitionPlayer.team.subtitle":
    "Consulta la plantilla y el club de tu equipo en esta competición.",
  "pages.captain.roster.title": "Plantilla",
  "pages.captain.roster.subtitle":
    "Revisa quién está en tu equipo, asigna roles y decide si admite jugadores nuevos.",
  "pages.captain.invitations.title": "Invitaciones del equipo",
  "pages.captain.invitations.subtitle":
    "Crea enlaces para que otros jugadores se unan a tu plantilla.",
  "captain.loading": "Cargando tu equipo…",
  "captain.noTeam.title": "No tienes equipo en esta competición",
  "captain.noTeam.description":
    "Cuando te unas a una plantilla, podrás gestionar tu equipo desde aquí.",
  "captain.noTeam.action": "Revisar mis invitaciones",
  "captain.forbidden.title": "No tienes acceso a esta página",
  "captain.forbidden.roster": "Solo el capitán y el subcapitán pueden gestionar la plantilla.",
  "captain.forbidden.team": "No puedes consultar la plantilla de este equipo.",
  "captain.forbidden.invitations": "Solo el capitán y el subcapitán pueden invitar jugadores.",
  "captain.forbidden.action": "Ir a Mi equipo",
  "captain.unavailable.title": "No se pudo comprobar tu acceso",
  "captain.unavailable.description": "Revisa tu conexión e inténtalo de nuevo.",
  "captain.stats.spots": "Plazas",
  "captain.stats.spotsFull": "Plantilla llena",
  "captain.stats.spotsLeft": (params) =>
    count(params) === 1 ? "Queda 1 plaza" : `Quedan ${count(params)} plazas`,
  "captain.stats.state": "Estado",
  "captain.stats.open": "Abierta",
  "captain.stats.closed": "Cerrada",
  "captain.stats.openHint": "Admite jugadores por invitación",
  "captain.stats.closedHint": "No admite jugadores nuevos",
  "captain.stats.club": "Club EA",
  "captain.stats.noClub": "Sin club EA",
  "captain.stats.noClubHint": "Hace falta para consultar partidos",
  "captain.roster.players": "Jugadores",
  "captain.roster.column.player": "Jugador",
  "captain.roster.column.role": "Rol",
  "captain.roster.open": "Abrir plantilla",
  "captain.roster.openDescription":
    "La plantilla volverá a admitir jugadores por invitación mientras tenga plazas.",
  "captain.roster.close": "Cerrar plantilla",
  "captain.roster.closeDescription":
    "Los enlaces de invitación dejarán de admitir jugadores mientras esté cerrada.",
  "captain.roster.invite": "Invitar jugador",
  "captain.roster.alone.title": "Solo estás tú en la plantilla",
  "captain.roster.alone.description": "Usa «Invitar jugador» para completar el equipo.",
  "captain.invitations.closed.title": "La plantilla está cerrada",
  "captain.invitations.closed.description":
    "Los enlaces no admitirán jugadores hasta que abras la plantilla.",
  "captain.invitations.closed.action": "Ir a la plantilla",
  "captain.invitations.full.title": "La plantilla está llena",
  "captain.invitations.full.description":
    "Los enlaces no admitirán jugadores hasta que haya plazas libres.",
  "captain.invitations.empty.title": "Crea un enlace de invitación",
  "captain.invitations.empty.description":
    "Usa «Invitar» para generar un enlace y compártelo con el jugador. Al aceptarlo, entra en tu plantilla.",
  "common.cancel": "Cancelar",
  "common.close": "Cerrar",
  "shell.nav.open": "Abrir navegación",
  "shell.nav.title": "Navegación",
  "shell.nav.context": "Contexto activo",
  "shell.nav.competition.overview": "Resumen",
  "shell.nav.competition.teams": "Equipos",
  "shell.nav.competition.roster": "Plantilla",
  "shell.nav.competition.teamInvitations": "Invitaciones del equipo",
  "shell.skipToContent": "Saltar al contenido",
  "roster.role.player": "Jugador",
  "roster.role.captain": "Capitán",
  "roster.role.vice_captain": "Subcapitán",
  "roster.role.aria": "Rol de {name}",
  "roster.role.confirmTitle": "Confirmar cambio de rol",
  "roster.role.confirmDescription": "{name} pasará a tener el rol {role}.",
  "roster.role.confirmAction": "Cambiar rol",
  "roster.invite.trigger": "Invitar",
  "roster.invite.title": "Crear invitación de plantilla",
  "roster.invite.description":
    "El enlace solo da acceso a este equipo y respeta el cupo y el estado actuales.",
  "roster.invite.role": "Rol inicial",
  "roster.invite.rolesRestricted": "Solo el capitán puede invitar con otro rol.",
  "roster.invite.uses": "Usos",
  "roster.invite.uses.single": "Un solo uso",
  "roster.invite.uses.multi": "Varios usos",
  "roster.invite.invitee": "Destinatario (ID de juego)",
  "roster.invite.inviteePlaceholder": "Ej. davos282",
  "roster.invite.inviteeHint":
    "Opcional. La invitación aparecerá en las invitaciones del jugador que registró ese ID.",
  "roster.invite.message": "Mensaje",
  "roster.invite.messagePlaceholder": "Opcional. Un mensaje breve para el jugador invitado.",
  "roster.invite.submit": "Crear invitación",
  "roster.link.title": "Enlace creado",
  "roster.link.description":
    "Compártelo con el jugador. Lo acepta desde su cuenta de Futrob y entra en tu plantilla.",
  "roster.link.copy": "Copiar enlace",
  "roster.link.copied": "Copiado",
  "roster.link.copiedStatus": "Enlace copiado",
  "roster.club.trigger": "Asociar club",
  "roster.club.title": "Buscar club EA",
  "roster.club.description":
    "Esta asociación solo sirve para localizar partidos. No verifica propiedad.",
  "roster.club.nameAria": "Nombre del club EA",
  "roster.club.placeholder": "Ej. Cuervos",
  "roster.club.search": "Buscar",
  "roster.club.searching": "Buscando…",
  "roster.club.select": "Asociar",
  "roster.club.searchFailed":
    "No se pudieron buscar clubes. Revisa tu conexión e inténtalo de nuevo.",
  "roster.club.hint": "Busca por nombre para elegir un club.",
  "errors.teams.roster_full": "La plantilla ya alcanzó su cupo máximo.",
  "errors.teams.roster_entry_inactive":
    "Este equipo ya no está activo en la competición. No se pueden cambiar plantillas.",
  "errors.teams.roster_competition_conflict":
    "Ese jugador ya pertenece a otro equipo en esta competición.",
  "errors.authorization.forbidden": "No tienes permiso para operar este equipo o esta competición.",
  "errors.teams.roster_invitation_expired": "La invitación ya expiró. Crea un enlace nuevo.",
  "errors.teams.client_network_error":
    "No pudimos conectar con Futrob. Conservamos tu contexto para que puedas reintentar.",
  "captain.entryClosed.title": "La inscripción no admite cambios",
  "captain.entryClosed.description":
    "La inscripción de tu equipo fue rechazada, así que la plantilla ya no se puede modificar.",
  "captain.roster.column.platform": "Plataforma",
  "captain.roster.platform.missing": "Sin identificador",
  "player.backToWorkspace": "Volver al espacio personal",
  "player.retry": "Reintentar",
  "player.partialData.description":
    "Algunas métricas no estuvieron disponibles en todos los partidos.",
  "player.noData": "Sin datos",
  "player.onboarding.checking": "Cargando tus datos…",
  "player.onboarding.failed": "No pudimos comprobar tu cuenta",
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
  "player.metric.rating": "Rating",
  "player.metric.matches": "Partidos",
  "player.metric.minutes": "Minutos",
  "player.position.unknown": "Posición sin datos",
  "landing.meta.title": "Futrob | Del partido de EA al resultado oficial",
  "landing.meta.description":
    "Opera ligas y copas de FC Clubs con datos reales de EA: selección auditable de partidos oficiales, tabla, rankings y portal público.",
  "landing.nav.aria": "Acceso",
  "landing.nav.sectionsAria": "Secciones",
  "landing.nav.howItWorks": "Cómo funciona",
  "landing.nav.portal": "Portal público",
  "landing.nav.login": "Iniciar sesión",
  "landing.nav.signup": "Crear cuenta",
  "landing.hero.title": "Del partido de EA al resultado oficial",
  "landing.hero.subtitle": "Los capitanes eligen qué partidos cuentan y tú apruebas el resultado.",
  "landing.hero.cta.primary": "Crear cuenta",
  "landing.hero.cta.secondary": "Ver cómo funciona",
  "landing.status.approved": "Aprobado",
  "landing.status.candidate": "Candidato EA",
  "landing.status.selecting": "En selección",
  "landing.status.synced": "Sync EA",
  "landing.status.scheduled": "Programado",
  "landing.status.published": "Publicado",
  "landing.board.label": "Ejemplo de jornada en Futrob",
  "landing.board.matchday": "Jornada 4",
  "landing.board.competition": "Liga Metropolitana",
  "landing.board.kickoff": "sáb 21:00",
  "landing.mechanism.title": "Cómo un partido se vuelve oficial",
  "landing.mechanism.subtitle":
    "Cada resultado muestra de dónde viene y en qué estado está. Nada se publica sin aprobación.",
  "landing.mechanism.sync.title": "Sync EA",
  "landing.mechanism.sync.description":
    "Futrob sincroniza los partidos de tus clubs desde EA y los guarda como candidatos, nunca como oficiales.",
  "landing.mechanism.selection.title": "Selección",
  "landing.mechanism.selection.description":
    "Los capitanes eligen cuáles partidos cuentan para el enfrentamiento, con vista previa de la serie.",
  "landing.mechanism.approval.title": "Aprobación",
  "landing.mechanism.approval.description":
    "El resultado confirmado queda aprobado y auditado. El sync nunca oficializa por su cuenta.",
  "landing.mechanism.publication.title": "Publicación",
  "landing.mechanism.publication.description":
    "Solo lo aprobado actualiza tabla, bracket, rankings y el portal público.",
  "landing.reschedule.title": "Reprogramar sin perder el hilo",
  "landing.reschedule.subtitle":
    "Un capitán propone otro horario y el rival responde. Al aceptarlo, el calendario y la búsqueda de partidos en EA se ajustan.",
  "landing.reschedule.guarantee": "Un partido aprobado o finalizado ya no se reprograma.",
  "landing.reschedule.panel.label": "Ejemplo de solicitud de reprogramación",
  "landing.reschedule.panel.status": "En negociación",
  "landing.reschedule.panel.sentence":
    "Sporting Lomas propone mover todo el enfrentamiento del 18 de octubre, 21:00 al 19 de octubre, 22:00.",
  "landing.reschedule.panel.respondBy": "Responde antes del 16 de octubre, 23:59.",
  "landing.reschedule.panel.options": "CD Estrella puede aceptar, contraproponer o rechazar.",
  "landing.demo.title": "Pruébalo contra la API real",
  "landing.demo.subtitle":
    "Busca tu club de EA Clubs. Es la misma capa de datos que alimenta tus competiciones.",
  "gameData.clubSearch.source": "Resultados de /api/v1/game-data/clubs/search.",
  "gameData.clubSearch.queryLabel": "Nombre del club",
  "gameData.clubSearch.queryPlaceholder": "Ej. Cuervos",
  "gameData.clubSearch.queryRequired": "Escribe el nombre del club.",
  "gameData.clubSearch.platformLabel": "Plataforma",
  "gameData.clubSearch.submit": "Buscar",
  "gameData.clubSearch.searching": "Buscando…",
  "gameData.clubSearch.retryIn": ({ seconds }) => `Reintentar en ${seconds} s`,
  "gameData.clubSearch.empty": "Sin resultados para esa búsqueda.",
  "gameData.clubSearch.error": "No pudimos buscar clubs. Inténtalo nuevamente.",
  "gameData.clubSearch.rateLimited": "Alcanzaste el límite temporal de búsquedas.",
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
    "Publica portada, equipos, calendario, resultados, tabla, bracket y rankings cuando tú decides.",
  "landing.portal.point.teams": "Equipos y calendario siempre al día",
  "landing.portal.point.results": "Resultados y tabla oficiales",
  "landing.portal.point.rankings": "Rankings de jugadores y equipos",
  "landing.portal.podium.caption": "Ejemplo de tabla oficial de la Liga Metropolitana",
  "landing.portal.podium.points": "puntos",
  "landing.cta.title": "Publica tu primera jornada oficial",
  "landing.cta.subtitle":
    "Crea tu organización, invita a los capitanes y arma tu primera competición.",
  "landing.cta.primary": "Crear cuenta",
  "landing.cta.secondary": "Ver precios",
  "landing.footer.tagline": "Preciso para operar. Claro para competir.",
  "landing.footer.madeBy": "Futrob es creado por Davion Software.",
  "encounter.breadcrumb": "Ruta del enfrentamiento",
  "encounter.title": ({ home, away }) => `${home} vs ${away}`,
  "encounter.vs": "VS",
  "encounter.side.home": "Local",
  "encounter.side.away": "Visitante",
  "encounter.round": ({ number }) => `Jornada ${number}`,
  "encounter.roundOf": ({ number, total }) => `Jornada ${number} de ${total}`,
  "encounter.timeZone": ({ zone }) => `Horarios en ${zone}`,
  "encounter.loading": "Cargando enfrentamiento",
  "encounter.error": "No pudimos cargar el enfrentamiento.",
  "encounter.notFound.title": "Enfrentamiento no disponible",
  "encounter.notFound.description":
    "No existe en esta competición o tu cuenta no tiene acceso a él.",
  "encounter.forbidden.title": "Sin acceso a este enfrentamiento",
  "encounter.forbidden.description":
    "Tu cuenta no tiene permiso para ver este enfrentamiento. Pide acceso a la organización.",
  "encounter.backToEncounters": "Volver a enfrentamientos",
  "encounters.list.label": "Enfrentamientos de la competición",
  "encounters.list.loading": "Cargando enfrentamientos",
  "encounters.list.error": "No pudimos cargar los enfrentamientos.",
  "encounters.list.timeZone": ({ zone }) => `Horarios en ${zone}`,
  "encounters.list.open": ({ home, away }) => `Abrir ${home} vs ${away}`,
  "encounters.list.slots": ({ count }) =>
    count === 1 ? "1 partido oficial" : `${count} partidos oficiales`,
  "encounters.list.status.scheduled": "Programado",
  "encounters.list.status.awaiting_result": "Pendiente de resultado",
  "encounters.list.status.official": "Resultado oficial",
  "encounters.list.empty.title": "Aún no hay enfrentamientos",
  "encounters.list.empty.description":
    "Aparecerán aquí cuando la competición tenga un calendario con ambos equipos definidos.",
  "encounters.list.notFound.title": "Competición no disponible",
  "encounters.list.notFound.description":
    "No existe en esta organización o tu cuenta no tiene acceso a sus enfrentamientos.",
  "disputes.list.label": "Disputas de la competición",
  "disputes.list.loading": "Cargando disputas",
  "disputes.list.error": "No pudimos cargar las disputas.",
  "disputes.list.timeZone": ({ zone }) => `Horarios en ${zone}`,
  "disputes.list.open": ({ home, away }) => `Revisar la disputa de ${home} vs ${away}`,
  "disputes.list.kickoff": ({ when }) => `Partido el ${when}`,
  "disputes.list.waiting": ({ since }) => `En espera desde ${since}`,
  "disputes.list.status.disputed": "En disputa",
  "disputes.list.status.organizer_review": "Revisión del organizador",
  "disputes.list.team.unnamed": "Equipo sin nombre disponible",
  "disputes.list.empty.title": "No hay disputas pendientes",
  "disputes.list.empty.description":
    "Aparecerán aquí cuando un equipo impugne la selección oficial o un caso pase a revisión del organizador.",
  "disputes.list.notFound.title": "Competición no disponible",
  "disputes.list.notFound.description":
    "No existe en esta organización o tu cuenta no puede revisar sus disputas.",
  "encounter.slots.title": "Partidos oficiales",
  "encounter.slots.description":
    "Cada partido tiene su propio horario. Asigna un partido EA para ver el resultado antes de proponerlo.",
  "encounter.slot.label": ({ slot }) => `Partido ${slot}`,
  "encounter.slot.unassigned": "Sin partido EA asignado",
  "encounter.slot.unmatched": "Los clubes de este partido EA no son los de ambos equipos.",
  "encounter.slot.clear": ({ slot }) => `Quitar partido EA del partido ${slot}`,
  "encounter.preview.title": "Vista previa",
  "encounter.preview.note":
    "Solo en esta pantalla: no se guarda ni oficializa. El resultado cuenta cuando el rival confirma la propuesta.",
  "encounter.preview.incomplete": "Asigna un partido EA a cada partido oficial para ver la serie.",
  "encounter.preview.aggregate": "Global",
  "encounter.preview.result": "Resultado",
  "encounter.preview.independent":
    "Cada partido cuenta por separado; esta competición no usa marcador global.",
  "encounter.preview.modeUnknown":
    "La competición todavía no define cómo se resuelve la serie; revisa cada marcador.",
  "encounter.outcome.win": ({ team }) => `Gana ${team}`,
  "encounter.outcome.draw": "Empate",
  "encounter.candidates.title": "Partidos EA candidatos",
  "encounter.candidates.description":
    "Partidos EA entre los clubes de ambos equipos cerca del horario. Elegir uno no envía nada.",
  "encounter.candidates.window": ({ from, to }) => `Buscados entre ${from} y ${to}`,
  "encounter.candidates.updated": ({ time }) => `Actualizado a las ${time}`,
  "encounter.candidates.refresh": "Actualizar candidatos",
  "encounter.candidates.refreshing": "Actualizando candidatos",
  "encounter.candidates.refreshFailed":
    "No pudimos actualizar. Ves los últimos candidatos cargados.",
  "encounter.candidates.list": "Partidos EA candidatos",
  "encounter.candidates.empty.title": "Sin partidos EA todavía",
  "encounter.candidates.empty.description":
    "No hay partidos EA entre ambos clubes cerca del horario. Actualiza después de jugar.",
  "encounter.candidates.notConnected.title": "Falta conectar un club EA",
  "encounter.candidates.notConnected.side": ({ team }) => `${team} no tiene un club EA conectado.`,
  "encounter.candidates.notConnected.description":
    "Los candidatos aparecen cuando ambos equipos conectan su club EA.",
  "encounter.candidates.providerMismatch.title": "Clubes de proveedores distintos",
  "encounter.candidates.providerMismatch.description":
    "Los clubes de ambos equipos usan proveedores de datos distintos, así que sus partidos no se pueden comparar.",
  "encounter.candidates.forbidden.title": "Candidatos restringidos",
  "encounter.candidates.forbidden.description":
    "Solo los equipos del enfrentamiento y la organización ven los partidos EA candidatos.",
  "encounter.candidates.error": "No pudimos cargar los partidos EA candidatos.",
  "encounter.candidate.label": ({ home, away, time }) => `${home} contra ${away}, ${time}`,
  "encounter.candidate.duration": ({ minutes }) => `${minutes} min`,
  "encounter.candidate.durationUnknown": "Duración desconocida",
  "encounter.candidate.disconnected": "Hubo desconexión",
  "encounter.candidate.forfeit": "Victoria por abandono",
  "encounter.candidate.partial": "Datos parciales",
  "encounter.candidate.unverified": "Datos sin verificar",
  "encounter.candidate.players": ({ count }) =>
    count === 1 ? "1 jugador registrado" : `${count} jugadores registrados`,
  "encounter.candidate.useIn": ({ slot }) => `Usar en partido ${slot}`,
  "encounter.candidate.usedIn": ({ slot }) => `En partido ${slot}`,
  "encounter.candidate.unused": "Sin usar",
  "encounter.selection.title": "Selección oficial",
  "encounter.selection.description":
    "Propón los partidos EA que cuentan, responde a la propuesta del rival o abre una disputa. Nada es oficial hasta que el rival confirma.",
  "encounter.selection.actingAs": "Actúas por",
  "encounter.selection.loading": "Cargando la selección oficial…",
  "encounter.selection.error": "No pudimos cargar la selección oficial.",
  "encounter.selection.forbidden":
    "No puedes ver ni operar la selección oficial de este enfrentamiento.",
  "encounter.selection.refresh": "Actualizar selección",
  "encounter.selection.refreshFailed":
    "No pudimos actualizar la selección. Los datos mostrados pueden haber cambiado.",
  "encounter.selection.empty.title": "Aún no hay propuesta",
  "encounter.selection.empty.description":
    "Asigna un partido EA a cada partido oficial y propón la selección al rival.",
  "encounter.selection.status.none": "Sin propuesta",
  "encounter.selection.status.awaiting_provider_data": "Esperando datos del proveedor",
  "encounter.selection.status.candidates_available": "Candidatos disponibles",
  "encounter.selection.status.selection_in_progress": "Selección en curso",
  "encounter.selection.status.awaiting_opponent_confirmation": "Esperando confirmación del rival",
  "encounter.selection.status.confirmed": "Confirmada",
  "encounter.selection.status.disputed": "En disputa",
  "encounter.selection.status.organizer_review": "En revisión de la organización",
  "encounter.selection.status.approved": "Aprobada",
  "encounter.selection.status.voided": "Anulada",
  "encounter.selection.version": ({ version }) => `Versión ${version}`,
  "encounter.selection.round": ({ round }) => `Ronda ${round}`,
  "encounter.selection.deadline": ({ date }) => `El rival puede responder hasta ${date}`,
  "encounter.selection.approved": "Resultado oficial aprobado",
  "encounter.selection.notOfficial": "Todavía no es un resultado oficial y no genera estadísticas.",
  "encounter.selection.noCommands": "No hay acciones disponibles para tu equipo en este estado.",
  "encounter.selection.dispute.title": "Disputa",
  "encounter.selection.dispute.status.open": "Abierta",
  "encounter.selection.dispute.status.under_review": "En revisión",
  "encounter.selection.dispute.status.resolved": "Resuelta",
  "encounter.selection.dispute.openedBy": ({ team }) => `Abierta por ${team}`,
  "encounter.selection.flags.title": "Avisos de integridad",
  "encounter.selection.flags.provider_data_incomplete": ({ match }) =>
    `Datos incompletos del proveedor en el partido EA ${match}`,
  "encounter.selection.flags.provider_match_disconnected": ({ match }) =>
    `Hubo desconexión en el partido EA ${match}`,
  "encounter.selection.proposals.title": "Propuestas",
  "encounter.selection.proposal.label": ({ sequence, round }) =>
    `Propuesta ${sequence} · ronda ${round}`,
  "encounter.selection.proposal.current": "Vigente",
  "encounter.selection.proposal.superseded": "Reemplazada",
  "encounter.selection.proposal.by": ({ team }) => `De ${team}`,
  "encounter.selection.slot.score": ({ slot, home, homeGoals, awayGoals, away }) =>
    `Partido ${slot}: ${home} ${homeGoals}–${awayGoals} ${away}`,
  "encounter.selection.slot.unmatched": ({ slot }) => `Partido ${slot}: jugado por otros clubes`,
  "encounter.selection.slot.missing": ({ slot }) =>
    `Partido ${slot}: ya no figura entre los candidatos`,
  "encounter.selection.slot.match": ({ match }) => `Partido EA ${match}`,
  "encounter.selection.slot.played": ({ match, time }) => `Partido EA ${match} · jugado ${time}`,
  "encounter.selection.slot.empty": ({ slot }) => `Partido ${slot}: sin partido EA asignado`,
  "encounter.selection.history.title": "Historial de la selección",
  "encounter.selection.history.byOperator": "Organización",
  "encounter.selection.history.bySystem": "Sistema",
  "encounter.selection.history.action.proposed": "Propuesta enviada",
  "encounter.selection.history.action.confirmed": "Propuesta confirmada",
  "encounter.selection.history.action.approved": "Resultado aprobado",
  "encounter.selection.history.action.integrity_review_required":
    "Revisión de integridad requerida",
  "encounter.selection.history.action.rejected": "Propuesta rechazada",
  "encounter.selection.history.action.alternative_proposed": "Alternativa propuesta",
  "encounter.selection.history.action.dispute_opened": "Disputa abierta",
  "encounter.selection.history.action.review_started": "Revisión iniciada",
  "encounter.selection.history.action.dispute_resolved_approved": "Disputa resuelta con aprobación",
  "encounter.selection.history.action.returned_to_selection": "Devuelta a selección",
  "encounter.selection.history.action.voided": "Resultado anulado",
  "encounter.selection.history.action.reference_reuse_rejected":
    "Partido EA ya usado en otro enfrentamiento",
  "encounter.selection.history.action.legacy_review_required":
    "Revisión requerida por datos anteriores",
  "encounter.selection.history.action.confirmation_expired": "Plazo de confirmación vencido",
  "encounter.selection.team.unknown": "Equipo sin identificar",
  "encounter.selection.command.propose.trigger": "Proponer selección",
  "encounter.selection.command.propose.title": "Proponer la selección al rival",
  "encounter.selection.command.propose.description":
    "El rival recibirá estos partidos EA para confirmarlos, rechazarlos o proponer otros.",
  "encounter.selection.command.propose.submit": "Enviar propuesta",
  "encounter.selection.command.propose.success": "Propuesta enviada al rival.",
  "encounter.selection.command.confirm.trigger": "Confirmar propuesta",
  "encounter.selection.command.confirm.title": "Confirmar la propuesta del rival",
  "encounter.selection.command.confirm.description":
    "Si no hay avisos de integridad, la selección queda aprobada como resultado oficial.",
  "encounter.selection.command.confirm.submit": "Confirmar",
  "encounter.selection.command.confirm.success": "Propuesta confirmada.",
  "encounter.selection.command.reject.trigger": "Rechazar",
  "encounter.selection.command.reject.title": "Rechazar la propuesta",
  "encounter.selection.command.reject.description":
    "La selección pasa a disputa y la organización decide. Nada se vuelve oficial.",
  "encounter.selection.command.reject.submit": "Rechazar propuesta",
  "encounter.selection.command.reject.success":
    "Propuesta rechazada. La selección queda en disputa.",
  "encounter.selection.command.propose_alternative.trigger": "Proponer alternativa",
  "encounter.selection.command.propose_alternative.title": "Proponer otros partidos EA",
  "encounter.selection.command.propose_alternative.description":
    "Si eliges los mismos partidos de la propuesta vigente, cuenta como confirmación. Si eliges otros, la selección pasa a disputa y la organización decide cuáles cuentan.",
  "encounter.selection.command.propose_alternative.submit": "Enviar alternativa",
  "encounter.selection.command.propose_alternative.success":
    "Alternativa enviada. Si coincide con la propuesta vigente, cuenta como confirmación; si no, la organización resolverá la disputa.",
  "encounter.selection.command.open_dispute.trigger": "Abrir disputa",
  "encounter.selection.command.open_dispute.title": "Abrir una disputa",
  "encounter.selection.command.open_dispute.description":
    "La organización revisará el caso. Mientras tanto, nada se vuelve oficial.",
  "encounter.selection.command.open_dispute.submit": "Abrir disputa",
  "encounter.selection.command.open_dispute.success": "Disputa abierta.",
  "encounter.selection.dialog.submitting": "Enviando…",
  "encounter.selection.dialog.cancel": "Cancelar",
  "encounter.selection.dialog.retry": "Reintentar",
  "encounter.selection.dialog.slots": "Partidos que envías",
  "encounter.selection.dialog.slotsIncomplete":
    "Asigna un partido EA a cada partido oficial antes de enviar.",
  "encounter.selection.dialog.target": "Propuesta a la que respondes",
  "encounter.selection.reason.label": "Motivo",
  "encounter.selection.reason.help":
    "Obligatorio. Lo verán el rival y la organización. Máximo 1000 caracteres.",
  "encounter.selection.reason.required": "Escribe un motivo para continuar.",
  "encounter.selection.conflict": ({ from, to }) =>
    `La selección cambió: leíste la versión ${from} y ahora está en la ${to}. Revisa el estado actual; tu borrador se conserva y no se reenvió nada.`,
  "encounter.selection.conflictStale": ({ from }) =>
    `La selección cambió desde la versión ${from}. Actualiza para ver el estado actual; tu borrador se conserva.`,
  "encounter.selection.unavailable": "Esta acción ya no está disponible en el estado actual.",
  "encounter.selection.unknown":
    "No sabemos si se guardó porque falló la conexión. Reintentar envía la misma solicitud y no la duplica.",
  "errors.results.reason_required": "Escribe un motivo para continuar.",
  "errors.results.invalid_selection":
    "La selección no es válida. Revisa los partidos EA asignados.",
  "errors.results.duplicate_provider_match":
    "Usaste el mismo partido EA en dos partidos oficiales.",
  "encounter.selection.proposal.approved": "Aprobada",
  "encounter.selection.proposal.closedRound": "Ronda cerrada",
  "encounter.selection.history.selected": ({ proposal }) => `Propuesta elegida: ${proposal}`,
  "encounter.selection.history.acknowledged": ({ count }) =>
    count === 1 ? "1 aviso de integridad reconocido" : `${count} avisos de integridad reconocidos`,
  "encounter.selection.outcome.approved": "Partidos aprobados",
  "encounter.selection.outcome.byAgreement": "por acuerdo de los equipos",
  "encounter.selection.outcome.byOperator": "por resolución de la organización",
  "encounter.selection.outcome.resolution": "Última resolución",
  "encounter.selection.outcome.approved_proposal": "La organización aprobó una propuesta.",
  "encounter.selection.outcome.returned_to_selection":
    "La organización devolvió el caso a selección. Los equipos deben acordar una propuesta nueva.",
  "encounter.review.title": "Revisión de la organización",
  "encounter.review.description":
    "Revisa la disputa, toma el caso y decide. Solo lo ve quien aprueba resultados y no se publica.",
  "encounter.review.loading": "Cargando el expediente…",
  "encounter.review.error": "No pudimos cargar el expediente.",
  "encounter.review.forbidden": "No puedes revisar disputas de este enfrentamiento.",
  "encounter.review.refresh": "Actualizar expediente",
  "encounter.review.refreshFailed":
    "No pudimos actualizar el expediente. Los datos mostrados pueden haber cambiado.",
  "encounter.review.tabs.label": "Expediente",
  "encounter.review.tabs.case": "Caso actual",
  "encounter.review.tabs.history": "Historial",
  "encounter.review.empty": "Aún no hay propuestas en este enfrentamiento.",
  "encounter.review.historyEmpty": "Todavía no hay acciones registradas.",
  "encounter.review.noCommands":
    "No hay decisiones pendientes para la organización en este estado.",
  "encounter.review.reason.help":
    "Obligatorio. Queda en el historial y lo verán ambos equipos. Máximo 1000 caracteres.",
  "encounter.review.command.review_dispute.trigger": "Tomar el caso",
  "encounter.review.command.review_dispute.title": "Tomar el caso",
  "encounter.review.command.review_dispute.description":
    "La disputa pasa a revisión de la organización y los equipos ya no pueden cambiarla. Tomar el caso no aprueba nada.",
  "encounter.review.command.review_dispute.submit": "Tomar el caso",
  "encounter.review.command.review_dispute.success":
    "Tomaste el caso. Está en revisión de la organización.",
  "encounter.review.command.approve_proposal.trigger": "Aprobar una propuesta",
  "encounter.review.command.approve_proposal.title": "Aprobar una propuesta",
  "encounter.review.command.approve_proposal.description":
    "La propuesta que elijas pasa a ser el resultado oficial y genera estadísticas.",
  "encounter.review.command.approve_proposal.submit": "Aprobar propuesta",
  "encounter.review.command.approve_proposal.success":
    "Propuesta aprobada. El resultado ya es oficial.",
  "encounter.review.command.return_to_selection.trigger": "Devolver a selección",
  "encounter.review.command.return_to_selection.title": "Devolver el caso a selección",
  "encounter.review.command.return_to_selection.description":
    "Las propuestas de esta ronda se cierran y los equipos deben acordar una selección nueva.",
  "encounter.review.command.return_to_selection.submit": "Devolver a selección",
  "encounter.review.command.return_to_selection.success": "Caso devuelto a selección.",
  "encounter.review.dialog.dispute": "Disputa que tomas",
  "encounter.review.dialog.choose": "Propuesta que apruebas",
  "encounter.review.dialog.chooseRequired": "Elige la propuesta que vas a aprobar.",
  "encounter.review.dialog.willApprove": "Se aprobará",
  "encounter.review.dialog.flags": "Avisos de integridad de esta propuesta",
  "encounter.review.dialog.acknowledge": "Revisé los avisos de integridad y apruebo igualmente",
  "encounter.review.dialog.acknowledgeRequired":
    "Confirma que revisaste los avisos de integridad para aprobar.",
  "encounter.review.dialog.willClose": "Propuestas que se cierran",
  "encounter.review.dialog.noResult": "No se crea ningún resultado oficial.",
  "errors.results.integrity_flags_not_acknowledged":
    "Esta propuesta tiene avisos de integridad. Confirma que los revisaste para aprobarla.",
  "errors.results.reference_already_claimed":
    "Un partido EA de esta propuesta ya cuenta en otro enfrentamiento.",
  "errors.results.candidate_not_associated":
    "Un partido EA de esta propuesta ya no es candidato de este enfrentamiento.",
  "errors.results.provider_match_snapshot_missing":
    "Faltan los datos de un partido EA de esta propuesta. Inténtalo más tarde.",
  "errors.results.proposal_not_found": "Esa propuesta ya no pertenece a la ronda actual.",
  "landing.footer.legal": "© 2026 Futrob",
  "shell.sidebar.label": "Navegación principal",
  "shell.sidebar.collapse": "Colapsar barra lateral",
  "shell.sidebar.expand": "Expandir barra lateral",
  "shell.nav.general": "General",
  "shell.nav.home": "Inicio",
  "shell.nav.competitions": "Competiciones",
  "shell.nav.invitations": "Invitaciones",
  "shell.nav.teams": "Equipos",
  "shell.nav.players": "Jugadores",
  "shell.nav.settings": "Ajustes",
  "shell.account.open": "Abrir menú de cuenta",
  "shell.account.signOut": "Cerrar sesión",
  "shell.account.fallback": "Cuenta",
  "shell.account.profile": "Perfil",
  "shell.account.feedback": "Enviar feedback",
  "shell.account.settings": "Configuración",
  "shell.account.providerHealth": "Salud del proveedor",
  "shell.account.planAdmin": "Planes y solicitudes",
  "pages.admin.billing.title": "Planes y solicitudes",
  "pages.admin.billing.subtitle":
    "Solicitudes de plan de las organizaciones y asignación manual. Solo para superusuarios.",
  "billing.admin.checkingAccess": "Comprobando permisos…",
  "billing.admin.accessUnavailable": "No pudimos comprobar tus permisos para ver este panel.",
  "billing.admin.denied.title": "No tienes acceso a este panel",
  "billing.admin.denied.description": "Asignar planes es solo para superusuarios.",
  "billing.admin.loading": "Cargando las solicitudes…",
  "billing.admin.error": "No pudimos cargar las solicitudes.",
  "billing.admin.queue.title": "Solicitudes pendientes",
  "billing.admin.queue.empty": "No hay solicitudes pendientes.",
  "billing.admin.queue.organization": "Organización",
  "billing.admin.queue.plan": "Plan pedido",
  "billing.admin.queue.date": "Pedida el",
  "billing.admin.queue.action": "Acción",
  "billing.admin.queue.assignLabel": "Asignar",
  "billing.admin.queue.assign": "Asignar {plan} a {organization}",
  "billing.admin.form.title": "Asignar un plan",
  "billing.admin.form.description":
    "Úsalo cuando el cobro ya se confirmó fuera del producto. El cambio queda en el historial de la organización.",
  "billing.admin.form.organizationId": "ID de la organización",
  "billing.admin.form.plan": "Plan",
  "billing.admin.form.reason": "Motivo",
  "billing.admin.form.reasonHint": "Ej.: pago recibido por transferencia el 10 de noviembre.",
  "billing.admin.form.submit": "Asignar plan",
  "billing.admin.form.submitting": "Asignando…",
  "billing.admin.form.success": "Asignamos el plan {plan} a la organización {organizationId}.",
  "billing.admin.form.forbidden": "No tienes permiso para asignar planes.",
  "billing.admin.form.notFound": "No encontramos esa organización.",
  "billing.admin.form.error": "No pudimos asignar el plan. Revisa los datos e inténtalo de nuevo.",
  "providerHealth.title": "Salud del proveedor EA",
  "providerHealth.subtitle":
    "Estado, métricas y fallos recientes de la integración con EA Clubs. Solo para superusuarios.",
  "providerHealth.refresh": "Actualizar",
  "providerHealth.checkingAccess": "Comprobando permisos…",
  "providerHealth.loading": "Cargando la salud del proveedor…",
  "providerHealth.error": "No pudimos cargar la salud del proveedor.",
  "providerHealth.refreshError":
    "No pudimos actualizar los datos. Puede que lo que ves no esté al día.",
  "providerHealth.denied.title": "No tienes acceso a este panel",
  "providerHealth.denied.description":
    "El panel de salud del proveedor es solo para superusuarios.",
  "providerHealth.accessUnavailable": "No pudimos comprobar tus permisos para ver este panel.",
  "providerHealth.empty.title": "Aún no hay actividad del proveedor",
  "providerHealth.empty.description":
    "Cuando se consulte EA Clubs aparecerán aquí las métricas de la ventana de observación.",
  "providerHealth.status.label": "Estado",
  "providerHealth.status.healthy": "Operativo",
  "providerHealth.status.degraded": "Degradado",
  "providerHealth.status.unavailable": "No disponible",
  "providerHealth.status.unknown": "Sin datos",
  "providerHealth.circuit.label": "Circuito",
  "providerHealth.circuit.closed": "Cerrado",
  "providerHealth.circuit.half_open": "Semiabierto",
  "providerHealth.circuit.open": "Abierto",
  "providerHealth.metrics": "Métricas de la ventana",
  "providerHealth.metric.sample": "Muestra",
  "providerHealth.metric.successRate": "Tasa de éxito",
  "providerHealth.metric.latency": "Latencia media",
  "providerHealth.metric.cacheHitRate": "Aciertos de caché",
  "providerHealth.metric.unit.ms": "ms",
  "providerHealth.metric.unavailable": "Sin datos",
  "providerHealth.window.title": "Ventana de observación",
  "providerHealth.window.startedAt": "Desde",
  "providerHealth.window.observedAt": "Observado",
  "providerHealth.calls.title": "Llamadas al proveedor",
  "providerHealth.calls.success": "Correctas",
  "providerHealth.calls.failure": "Fallidas",
  "providerHealth.calls.lastSuccess": "Último éxito",
  "providerHealth.calls.lastFailure": "Último fallo",
  "providerHealth.calls.never": "Nunca en la ventana",
  "providerHealth.failures.title": "Fallos recientes",
  "providerHealth.failures.none": "Sin fallos en la ventana de observación.",
  "providerHealth.failures.some":
    "El proveedor registró fallos en la ventana de observación. El detalle de cada error no se expone en este panel.",
  "providerHealth.cache.title": "Caché",
  "providerHealth.cache.hits": "Aciertos",
  "providerHealth.cache.misses": "Sin acierto",
  "providerHealth.cache.stale": "Obsoletos servidos",
  "encounter.documentTitle": "Enfrentamiento",
  "encounters.list.documentTitle": "Enfrentamientos",
  "matches.list.documentTitle": "Partidos",
  "pages.competition.stats.title": "Estadísticas de equipos",
  "pages.competition.stats.subtitle":
    "Totales y promedios oficiales de cada equipo, calculados con resultados aprobados.",
  "competition.teamStats.documentTitle": "Estadísticas de equipos",
  "competition.teamStats.loading": "Cargando estadísticas de equipos…",
  "competition.teamStats.error": "No pudimos cargar las estadísticas de equipos.",
  "competition.teamStats.accessError": "No pudimos comprobar tu acceso a estas estadísticas.",
  "competition.teamStats.refreshFailed":
    "No pudimos actualizar las estadísticas. Se muestran los últimos datos cargados.",
  "competition.teamStats.forbidden.title": "No tienes acceso a estas estadísticas",
  "competition.teamStats.forbidden.description":
    "Las estadísticas de equipos de esta competición están disponibles para quien la organiza.",
  "competition.teamStats.forbidden.back": "Volver a la organización",
  "competition.teamStats.notFound.title": "Competición no disponible",
  "competition.teamStats.notFound.description":
    "No encontramos esta competición en la organización o ya no está disponible.",
  "competition.teamStats.empty.title": "Aún no hay estadísticas oficiales",
  "competition.teamStats.empty.description":
    "Las estadísticas de cada equipo aparecen cuando se aprueba su primer resultado oficial.",
  "competition.teamStats.empty.action": "Ver enfrentamientos",
  "competition.teamStats.summary.label": "Resumen de estadísticas de equipos",
  "competition.teamStats.summary.teams": "Equipos con estadísticas",
  "competition.teamStats.summary.updated": "Actualizado: {date}",
  "competition.teamStats.summary.goals": "Más goles",
  "competition.teamStats.summary.assists": "Más asistencias",
  "competition.teamStats.summary.rating": "Mejor rating promedio",
  "competition.teamStats.leader.tied": "{team} y {count} más",
  "competition.teamStats.leader.partial": "{teams} · dato parcial",
  "competition.teamStats.comparison.title": "Comparación de equipos",
  "competition.teamStats.comparison.description":
    "Ordena por cualquier columna. «—» indica un dato que no se registró.",
  "competition.teamStats.view.label": "Mostrar cifras",
  "competition.teamStats.view.totals": "Totales",
  "competition.teamStats.view.averages": "Por partido",
  "competition.teamStats.view.per90": "Por 90 min",
  "competition.teamStats.table.label": "Estadísticas oficiales por equipo: {view}",
  "competition.teamStats.column.team": "Equipo",
  "competition.teamStats.column.mvpAwards": "MVP",
  "competition.teamStats.column.rating": "Rating promedio",
  "competition.teamStats.sort.ascending": "orden ascendente",
  "competition.teamStats.sort.descending": "orden descendente",
  "competition.teamStats.partial.marker": "dato parcial",
  "competition.teamStats.partial.title": "Datos parciales",
  "competition.teamStats.partial.description":
    "Algunos partidos aprobados no registraron todas las métricas. Las cifras con * solo cuentan los partidos que tienen el dato.",
  "competition.teamStats.unavailable": "Sin datos",
  "competition.teamStats.teamName.unavailable": "Equipo sin nombre disponible",
  "competition.teamStats.teamName.loading": "Cargando nombre del equipo",
  "competition.teamStats.teamName.error":
    "No pudimos cargar los nombres de los equipos. Las cifras siguen disponibles.",
  "competition.teamStats.teamName.denied":
    "No tienes acceso a los nombres de los equipos. Las cifras siguen disponibles.",
  "competition.teamStats.teamName.refreshFailed":
    "No pudimos actualizar los nombres de los equipos. Se muestran los últimos cargados.",
  "standings.documentTitle": "Clasificación",
  "standings.loading": "Cargando la clasificación",
  "standings.error": "No pudimos cargar la clasificación.",
  "standings.refreshError":
    "No pudimos actualizar la clasificación. Ves la última lectura correcta.",
  "standings.teamNames.refreshError":
    "No pudimos actualizar los nombres de los equipos. Ves los últimos nombres cargados.",
  "standings.accessError": "No pudimos comprobar tu acceso a la clasificación.",
  "standings.forbidden.title": "No tienes acceso a la clasificación",
  "standings.forbidden.description":
    "Tu cuenta no tiene permiso para ver la tabla oficial de esta competición.",
  "standings.forbidden.back": "Volver a la organización",
  "standings.notFound.title": "No encontramos esta competición",
  "standings.notFound.description":
    "La competición ya no existe o el enlace no es correcto. No es un problema de permisos ni un fallo temporal.",
  "standings.notFound.action": "Ver competiciones",
  "standings.empty.title": "Aún no hay clasificación oficial",
  "standings.empty.description":
    "La tabla se calcula solo con resultados oficiales aprobados y aparecerá cuando se apruebe el primero. Los partidos de EA sin aprobar no cuentan.",
  "standings.empty.action": "Ver enfrentamientos",
  "standings.table.label": "Clasificación oficial",
  "standings.table.updated": ({ time }) => `Actualizada ${time}`,
  "standings.table.formula": ({ version }) => `Fórmula ${version}`,
  "standings.teamNames.error":
    "No pudimos cargar los nombres de los equipos. La tabla muestra las cifras con un nombre genérico.",
  "standings.team.loading": "Cargando nombre del equipo",
  "standings.team.unresolved": "Equipo sin nombre disponible",
  "standings.col.position": "Pos.",
  "standings.col.position.full": "Posición",
  "standings.col.team": "Equipo",
  "standings.col.played": "PJ",
  "standings.col.played.full": "Partidos jugados",
  "standings.col.goalDifference": "DG",
  "standings.col.goalDifference.full": "Diferencia de goles",
  "standings.col.points": "Pts",
  "standings.col.points.full": "Puntos",
  "standings.col.buchholz": "Buch.",
  "standings.col.buchholz.full": "Buchholz: suma de los puntos de los rivales",
  "standings.swiss.round": ({ current, total }) => `Ronda ${current} de ${total}`,
  "standings.swiss.completed": ({ completed, total }) =>
    `${completed} de ${total} rondas completadas`,
  "standings.swiss.final": "Clasificación final",
  "standings.swiss.tiebreak":
    "Empates: primero Buchholz (puntos de los rivales), luego diferencia de goles y goles a favor.",
  "standings.swiss.byes": ({ count }) =>
    Number(count) === 1 ? "1 descanso" : `${count} descansos`,
  "standings.swiss.withdrawn": "Retirado",
  "standings.col.form": "Forma",
  "standings.col.form.full": "Últimos 5 partidos, el más reciente al final",
  "standings.form.win": "Victoria",
  "standings.form.win.short": "G",
  "standings.form.draw": "Empate",
  "standings.form.draw.short": "E",
  "standings.form.loss": "Derrota",
  "standings.form.loss.short": "P",
  "standings.playoffCut": ({ count }) =>
    count === 1
      ? "El primero pasa al playoff"
      : `Los ${SPANISH_SMALL_NUMBERS[Number(count)] ?? count} primeros pasan al playoff`,
  "competition.overview.documentTitle": "Resumen",
  "competition.overview.description":
    "Estado, equipos, próximos enfrentamientos y pendientes de la competición.",
  "competition.overview.loading": "Cargando la competición",
  "competition.overview.error": "No pudimos cargar la competición.",
  "competition.overview.accessError": "No pudimos comprobar tu acceso a la competición.",
  "competition.overview.memberTitle": "Ya formas parte de la competición",
  "competition.overview.memberDescription":
    "Tu acceso está listo. Usa el menú para ver tus partidos, estadísticas y equipo.",
  "competition.overview.status": "Estado de la competición",
  "competition.overview.continueSetup": "Continuar configuración",
  "competition.overview.kpi.label": "Indicadores de la competición",
  "competition.overview.kpi.teams": "Equipos aprobados",
  "competition.overview.kpi.applications": "Inscripciones por revisar",
  "competition.overview.kpi.upcoming": "Próximos enfrentamientos",
  "competition.overview.kpi.awaiting": "Sin resultado oficial",
  "competition.overview.pending.title": "Pendientes",
  "competition.overview.pending.applications": ({ count }) =>
    Number(count) === 1
      ? "1 inscripción de equipo por revisar"
      : `${count} inscripciones de equipo por revisar`,
  "competition.overview.pending.awaiting": ({ count }) =>
    Number(count) === 1
      ? "1 enfrentamiento sin resultado oficial"
      : `${count} enfrentamientos sin resultado oficial`,
  "competition.overview.pending.activities": "Tareas abiertas",
  "competition.overview.pending.error": "No pudimos cargar todas las tareas pendientes.",
  "competition.overview.pending.empty.title": "Todo al día",
  "competition.overview.pending.empty.description":
    "No hay inscripciones, resultados ni disputas esperando tu revisión.",
  "competition.overview.upcoming.title": "Próximos enfrentamientos",
  "competition.overview.upcoming.viewAll": "Ver todos",
  "competition.overview.upcoming.error": "No pudimos cargar los enfrentamientos.",
  "competition.overview.upcoming.empty.title": "Sin enfrentamientos programados",
  "competition.overview.upcoming.empty.description":
    "Cuando el calendario tenga cruces por jugar, los verás aquí.",
  "competition.overview.teams.title": "Equipos",
  "competition.overview.teams.viewAll": "Ver todos",
  "competition.overview.teams.error": "No pudimos cargar los equipos.",
  "competition.overview.teams.empty.title": "Aún no hay equipos",
  "competition.overview.teams.empty.description":
    "Invita a capitanes o aprueba solicitudes para completar la competición.",
  "competition.overview.teams.empty.action": "Gestionar equipos",
  "competition.overview.teams.roster": ({ count, max }) => `${count} de ${max} jugadores`,
  "competition.overview.teams.entry.pending": "Por revisar",
  "competition.overview.teams.entry.approved": "Aprobado",
  "fixture.documentTitle": "Calendario",
  "fixture.loading": "Cargando el calendario",
  "fixture.error": "No pudimos cargar el calendario.",
  "fixture.refreshError": "No pudimos actualizar el calendario. Ves la última lectura correcta.",
  "fixture.notFound.title": "Competición no disponible",
  "fixture.notFound.description":
    "Puede que se haya eliminado o que no tengas acceso a su calendario.",
  "fixture.empty.title": "Aún no hay calendario",
  "fixture.empty.description": "Cuando se genere el fixture, verás aquí cada etapa y sus rondas.",
  "fixture.timeZone": ({ zone }) => `Horarios en ${zone}`,
  "fixture.round.pending": ({ number }) => `Se empareja cuando se oficialice la ronda ${number}`,
  "fixture.round.expected": ({ date }) => `Fecha prevista: ${date}`,
  "fixture.bye": ({ team }) => `${team} descansa`,
  "fixture.closed": "No disputado",
  "fixture.side.withdrawn": "Retirado",
  "fixture.swiss.progress": ({ paired, total }) => `Rondas emparejadas: ${paired} de ${total}`,
  "fixture.swiss.withdrawn": ({ teams }) => `Retirados: ${teams}`,
  "fixture.generate.title": "Genera el calendario",
  "fixture.generate.description": ({ count }) =>
    `La ronda 1 se empareja ahora con los ${count} equipos aprobados. Las siguientes se emparejan solas cuando se oficializa la anterior.`,
  "fixture.generate.start": "Inicio de la ronda 1",
  "fixture.generate.startInvalid": "Indica una fecha y hora futuras.",
  "fixture.generate.interval": "Días entre rondas",
  "fixture.generate.intervalInvalid": "Indica un número entero de días, desde 1.",
  "fixture.generate.rounds": "Número de rondas",
  "fixture.generate.roundsHint": ({ recommended, max }) =>
    `Recomendadas: ${recommended}. Máximo: ${max}.`,
  "fixture.generate.roundsInvalid": ({ max }) => `Indica entre 1 y ${max} rondas.`,
  "fixture.generate.submit": "Generar calendario",
  "fixture.generate.done": "Calendario generado.",
  "fixture.generate.needTeams":
    "Para generar el calendario hacen falta al menos 2 equipos aprobados.",
  "fixture.action.reason": "Motivo",
  "fixture.action.reasonRequired": "Escribe el motivo.",
  "fixture.close.trigger": "Cerrar ronda sin resultado",
  "fixture.close.title": ({ number }) => `Cerrar la ronda ${number} sin resultado`,
  "fixture.close.description":
    "Los enfrentamientos de esta ronda sin resultado oficial quedan como no disputados: se cancela su selección abierta, nadie suma puntos y esos equipos cuentan como ya enfrentados. La ronda siguiente se empareja enseguida. No se puede deshacer.",
  "fixture.close.confirm": "Confirmar cierre",
  "fixture.close.done": ({ number }) => `Ronda ${number} cerrada sin resultado.`,
  "fixture.withdraw.trigger": "Retirar equipo",
  "fixture.withdraw.title": "Retirar un equipo",
  "fixture.withdraw.description":
    "El equipo deja de emparejarse y no se puede reincorporar. En su partido sin resultado se cancela la selección abierta y el rival recibe un descanso, que suma como una victoria. Sus resultados oficiales se conservan y sigue en la clasificación, marcado como retirado.",
  "fixture.withdraw.team": "Equipo",
  "fixture.withdraw.teamPlaceholder": "Selecciona un equipo",
  "fixture.withdraw.teamRequired": "Selecciona el equipo.",
  "fixture.withdraw.confirm": "Confirmar retirada",
  "fixture.withdraw.done": ({ team }) => `${team} queda retirado.`,
  "fixture.recovery.unknown":
    "No sabemos si se aplicó. Vuelve a intentarlo: si ya se aplicó, no se repetirá.",
  "fixture.recovery.roundNotCurrent":
    "Esa ronda ya no es la que se está jugando. Revisa el calendario actualizado.",
  "fixture.recovery.alreadyWithdrawn": "Ese equipo ya estaba retirado.",
  "fixture.recovery.notParticipant": "Ese equipo no juega este calendario.",
  "fixture.recovery.notSwiss": "Este calendario no es de sistema suizo.",
  "fixture.recovery.conflict":
    "El calendario cambió mientras enviabas la acción. Revísalo y vuelve a intentarlo.",
  "fixture.recovery.planGone": "Este calendario ya no está vigente. Revisa el actual.",
  "fixture.recovery.generationConflict":
    "Ya existe un calendario generado con otros datos. Revisa el calendario actual.",
  "fixture.recovery.notPublished": "Publica la competición para generar su calendario.",
  "fixture.recovery.permission": "Ya no tienes permiso para gestionar este calendario.",
  "fixture.recovery.invalidGenerate":
    "El servidor rechazó estos datos. Revisa el número de rondas y que haya al menos 2 equipos aprobados.",
  "fixture.recovery.invalidCommand":
    "No pudimos aceptar esta acción. Ciérrala, abre de nuevo el diálogo y vuelve a intentarlo.",
  "errors.scheduling.not_swiss_fixture": "Este calendario no es de sistema suizo.",
  "errors.scheduling.swiss_round_not_current": "Esa ronda ya no es la que se está jugando.",
  "errors.scheduling.swiss_team_already_withdrawn": "Ese equipo ya estaba retirado.",
  "errors.scheduling.swiss_team_not_participant": "Ese equipo no juega este calendario.",
  "errors.scheduling.invalid_fixture_configuration":
    "La configuración del calendario no es válida.",
  "errors.scheduling.fixture_source_not_published":
    "Publica la competición para generar su calendario.",
  "errors.scheduling.fixture_generation_conflict":
    "Ya existe un calendario generado con otros datos.",
  "fixture.round.matchday": ({ number }) => `Jornada ${number}`,
  "fixture.round.final": "Final",
  "fixture.round.semifinal": "Semifinales",
  "fixture.round.quarterfinal": "Cuartos de final",
  "fixture.round.roundOf16": "Octavos de final",
  "fixture.round.number": ({ number }) => `Ronda ${number}`,
  "fixture.side.unknownTeam": "Equipo no disponible",
  "fixture.side.bye": "Descansa",
  "fixture.side.winner.unknown": "Ganador por definir",
  "fixture.side.winner.final": "Ganador de la final",
  "fixture.side.winner.semifinal": ({ order }) => `Ganador de la semifinal ${order}`,
  "fixture.side.winner.quarterfinal": ({ order }) => `Ganador de cuartos ${order}`,
  "fixture.side.winner.roundOf16": ({ order }) => `Ganador de octavos ${order}`,
  "fixture.side.winner.matchday": ({ number, order }) =>
    `Ganador del cruce ${order} de la jornada ${number}`,
  "fixture.side.winner.round": ({ number, order }) =>
    `Ganador del cruce ${order} de la ronda ${number}`,
  "fixture.side.groupRank": ({ place, group }) => `${place} del grupo ${group}`,
  "fixture.side.stageRank": ({ place, stage }) => `${place} de ${stage}`,
  "fixture.slots": ({ count }) => (Number(count) === 1 ? "1 partido" : `${count} partidos`),
  "fixture.group": ({ group }) => `Grupo ${group}`,
  "fixture.open": ({ home, away }) => `Abrir ${home} vs ${away}`,
  "fixture.openAt": ({ home, away, date }) => `Abrir ${home} vs ${away}, ${date}`,
  "fixture.views.label": "Vista del calendario",
  "fixture.views.agenda": "Agenda",
  "fixture.views.month": "Calendario",
  "fixture.views.rounds": "Jornadas",
  "fixture.filters.label": "Filtrar enfrentamientos",
  "fixture.filters.team": "Equipo",
  "fixture.filters.allTeams": "Todos los equipos",
  "fixture.filters.round": "Ronda",
  "fixture.filters.allRounds": "Todas las rondas",
  "fixture.filters.roundOption": ({ stage, round }) => `${stage} · ${round}`,
  "fixture.filters.reset": "Limpiar filtros",
  "fixture.filtered.title": "Sin enfrentamientos con estos filtros",
  "fixture.filtered.description": "Prueba con otro equipo o muestra todas las rondas.",
  "fixture.encounters": ({ count }) =>
    Number(count) === 1 ? "1 enfrentamiento" : `${count} enfrentamientos`,
  "fixture.summary": ({ count, dates }) =>
    `${Number(count) === 1 ? "1 enfrentamiento" : `${count} enfrentamientos`} en ${
      Number(dates) === 1 ? "1 fecha" : `${dates} fechas`
    }`,
  "fixture.agenda.label": "Enfrentamientos por fecha",
  "fixture.agenda.nextDate": "Próxima fecha",
  "fixture.agenda.overview": "Resumen del calendario",
  "fixture.agenda.noNextDate": "Sin fechas pendientes",
  "fixture.agenda.dates": "Fechas",
  "fixture.agenda.encounters": "Enfrentamientos",
  "fixture.agenda.timeZone": "Zona horaria",
  "fixture.month.label": "Mes del calendario",
  "fixture.month.previous": "Mes anterior",
  "fixture.month.next": "Mes siguiente",
  "fixture.month.goToNext": "Próxima fecha",
  "fixture.month.day": ({ date, count }) =>
    `${date}: ${Number(count) === 1 ? "1 enfrentamiento" : `${count} enfrentamientos`}`,
  "fixture.month.more": ({ count }) => `+${count} más`,
  "fixture.month.selectedDay": "Día seleccionado",
  "fixture.month.emptyDay": "No hay enfrentamientos este día.",
  "fixture.month.emptyMonth": "No hay enfrentamientos este mes.",
  "fixture.month.goTo": ({ month }) => `Ver ${month}`,
  "fixture.rounds.current": "Próxima",
  "fixture.rounds.emptyRound": "Sin enfrentamientos con estos filtros.",
  "fixture.rounds.scroll": ({ stage }) => `Jornadas de ${stage}`,
  "portal.nav.label": "Secciones de la competición",
  "portal.section.cover": "Portada",
  "portal.section.calendar": "Calendario y resultados",
  "portal.section.standings": "Tabla",
  "portal.section.bracket": "Bracket",
  "portal.section.teams": "Equipos",
  "portal.section.rankings": "Rankings",
  "portal.section.rules": "Reglamento",
  "portal.status.published": "En juego",
  "portal.status.paused": "En pausa",
  "portal.status.finished": "Finalizada",
  "portal.header.eyebrow": "Competición pública",
  "portal.header.teams": ({ count }) => (count === 1 ? "1 equipo" : `${count} equipos`),
  "portal.header.timeZone": ({ zone }) => `Horarios en ${zone}`,
  "portal.footer.poweredBy": "Publicado con Futrob",
  "portal.footer.home": "Conoce Futrob",
  "portal.meta.description": ({ name }) =>
    `Calendario, resultados, tabla, bracket y rankings de ${name}, publicados en Futrob.`,
  "portal.loading": "Cargando la sección",
  "portal.error.title": "No pudimos cargar esta sección",
  "portal.error.description":
    "Puede ser un problema temporal. Vuelve a intentarlo en unos segundos.",
  "portal.error.retry": "Reintentar",
  "portal.notFound.title": "Esta competición no está disponible",
  "portal.notFound.description":
    "Revisa el enlace. Si es correcto, la competición todavía no está publicada.",
  "portal.notFound.action": "Ir a Futrob",
  "portal.cover.upcoming": "Próximos enfrentamientos",
  "portal.cover.upcoming.empty": "No quedan enfrentamientos por jugar.",
  "portal.cover.results": "Últimos resultados",
  "portal.cover.results.empty": "Aún no hay resultados oficiales.",
  "portal.cover.calendarLink": "Ver calendario completo",
  "portal.noFixture.title": "El calendario aún no está publicado",
  "portal.noFixture.description":
    "Cuando la organización genere el fixture, verás aquí cada jornada y sus resultados.",
  "portal.calendar.round": ({ round }) => `Jornada ${round}`,
  "portal.encounter.status.scheduled": "Programado",
  "portal.encounter.status.awaiting_result": "Pendiente de resultado",
  "portal.encounter.status.official": "Oficial",
  "portal.encounter.status.closed": "Cerrado",
  "portal.encounter.versus": "vs",
  "portal.encounter.label": ({ home, away }) => `${home} contra ${away}`,
  "portal.encounter.score": ({ score }) => `Resultado oficial ${score}`,
  "portal.standings.caption": "Tabla oficial, calculada solo con resultados oficializados.",
  "portal.standings.empty.title": "Aún no hay tabla",
  "portal.standings.empty.description":
    "La tabla aparece cuando la organización oficializa el primer resultado.",
  "portal.standings.col.wins": "G",
  "portal.standings.col.wins.full": "Ganados",
  "portal.standings.col.draws": "E",
  "portal.standings.col.draws.full": "Empatados",
  "portal.standings.col.losses": "P",
  "portal.standings.col.losses.full": "Perdidos",
  "portal.standings.col.goalsFor": "GF",
  "portal.standings.col.goalsFor.full": "Goles a favor",
  "portal.standings.col.goalsAgainst": "GC",
  "portal.standings.col.goalsAgainst.full": "Goles en contra",
  "portal.bracket.stage.knockout": "Eliminatorias",
  "portal.bracket.stage.playoffs": "Playoffs",
  "portal.bracket.round": ({ round }) => `Ronda ${round}`,
  "portal.bracket.encounter": ({ order }) => `Cruce ${order}`,
  "portal.bracket.side.bye": "Descanso",
  "portal.bracket.side.winner": ({ round, order }) => `Ganador del cruce ${order} (ronda ${round})`,
  "portal.bracket.side.groupRank": ({ group, rank }) => `${rank}.º del grupo ${group}`,
  "portal.bracket.side.stageRank": ({ rank }) => `${rank}.º de la fase anterior`,
  "portal.bracket.side.pending": "Por definir",
  "portal.teams.empty.title": "Aún no hay equipos confirmados",
  "portal.teams.empty.description":
    "Los equipos aparecen aquí cuando la organización aprueba su inscripción.",
  "portal.rankings.kinds": "Tipo de ranking",
  "portal.rankings.col.player": "Jugador",
  "portal.rankings.col.team": "Equipo",
  "portal.rankings.col.matches": "PJ",
  "portal.rankings.col.matches.full": "Partidos jugados",
  "portal.rankings.empty.title": "Aún no hay datos para este ranking",
  "portal.rankings.empty.description":
    "Los rankings se calculan con las estadísticas de los partidos oficializados.",
  "portal.rules.format": "Formato",
  "portal.rules.teams": "Equipos",
  "portal.rules.teams.range": ({ min, max }) => `De ${min} a ${max}`,
  "portal.rules.teams.min": ({ min }) => `Desde ${min}`,
  "portal.rules.roster": "Plantilla máxima",
  "portal.rules.roster.value": ({ count }) => `${count} jugadores`,
  "portal.rules.roster.default": "La de la plataforma",
  "portal.rules.stage.regular": "Fase regular",
  "portal.rules.stage.knockout": "Eliminatorias",
  "portal.rules.points": "Puntos (victoria, empate, derrota)",
  "portal.rules.matches": "Partidos oficiales por enfrentamiento",
  "portal.rules.resolution": "Cómo se decide un enfrentamiento",
  "portal.rules.resolution.independent_matches": "Cada partido suma por separado",
  "portal.rules.resolution.aggregate_score": "Marcador global",
  "portal.rules.rescheduling": "Reprogramaciones",
  "portal.rules.rescheduling.none": "No se permiten",
  "portal.rules.rescheduling.limited": ({ count, hours }) =>
    `Hasta ${count} por equipo, con ${hours} h de aviso`,
  "portal.rules.rescheduling.unlimited": ({ hours }) => `Sin límite, con ${hours} h de aviso`,
  "portal.rules.empty.title": "El reglamento aún no está publicado",
  "portal.rules.empty.description":
    "La organización todavía no ha guardado las reglas de esta competición.",
  "competition.overview.viewPortal": "Ver portal público",
} satisfies Record<string, Message>;

export type MessageKey = keyof typeof es;
export type Catalog = Readonly<{ [K in MessageKey]: Message }>;

export interface MessageParamsByKey {
  readonly "audit.correlation": { readonly id: string };
  readonly "bracket.rounds.other": { readonly count: number };
  readonly "bracket.encounters.other": { readonly count: number };
  readonly "bracket.byes.other": { readonly count: number };
  readonly "bracket.canvasLabel": { readonly stage: string };
  readonly "bracket.unlinked.other": { readonly count: number };
  readonly "bracket.node.number": { readonly number: number };
  readonly "bracket.node.label": {
    readonly away: string;
    readonly home: string;
    readonly kickoff: string;
    readonly number: number;
    readonly round: string;
    readonly status: string;
  };
  readonly "bracket.filter.summary": { readonly shown: number; readonly total: number };
  readonly "bracket.list.matchup": { readonly away: string; readonly home: string };

  readonly "billing.plan.status.trialing": { readonly date: string };
  readonly "billing.plan.status.lapsed": { readonly plan: string };
  readonly "billing.request.action": { readonly plan: string };
  readonly "billing.request.pending": {
    readonly current: string;
    readonly date: string;
    readonly plan: string;
  };
  readonly "billing.admin.queue.assign": {
    readonly organization: string;
    readonly plan: string;
  };
  readonly "billing.admin.form.success": {
    readonly organizationId: string;
    readonly plan: string;
  };
  readonly "billing.usage.value": { readonly limit: number; readonly used: number };
  readonly "billing.usage.unlimited": { readonly used: number };
  readonly "billing.usage.resets": { readonly date: string };
  readonly "billing.features.formats": { readonly formats: string };
  readonly "billing.features.teamsPerCompetition": { readonly count: number };
  readonly "billing.features.notifications": { readonly channels: string };
  readonly "billing.changes.assigned": { readonly plan: string; readonly status: string };
  readonly "billing.changes.from": { readonly after: string; readonly before: string };
  readonly "pricing.perMonth": { readonly count: number };
  readonly "pricing.fairUse": { readonly count: number };
  readonly "pricing.note.paid": { readonly plan: string };
  readonly "pricing.competitions": { readonly count: number };
  readonly "pricing.format": { readonly format: string };
  readonly "pricing.staff": { readonly count: number };
  readonly "competition.overview.pending.applications": { readonly count: number };
  readonly "competition.overview.pending.awaiting": { readonly count: number };
  readonly "competition.overview.teams.roster": { readonly count: number; readonly max: number };
  readonly "competition.rankings.eligibility": {
    readonly matches: number;
    readonly percent: string;
  };
  readonly "competitionRules.format.teamsRange": { readonly min: number; readonly max: number };
  readonly "competitionRules.format.teamsAtLeast": { readonly min: number };
  readonly "competitionRules.value.matches": { readonly count: number };
  readonly "competitionRules.value.hours": { readonly count: number };
  readonly "competitionRules.value.players": { readonly count: number };
  readonly "competitionRules.roster.default": { readonly count: number };
  readonly "organizations.members.actionsFor": { readonly name: string };
  readonly "organizations.members.list.noMatchesFor": { readonly query: string };
  readonly "org.teams.count": { readonly count: number };
  readonly "org.teams.countFiltered": { readonly shown: number; readonly total: number };
  readonly "org.teams.created": { readonly date: string };
  readonly "org.teams.link": { readonly competition: string; readonly team: string };
  readonly "org.teams.noMatches.description": { readonly query: string };
  "reschedule.scope.slot": { slot: number };
  "reschedule.requestedBy": { team: string };
  "reschedule.proposedBy": { team: string };
  "reschedule.deadline": { date: string };
  "reschedule.summary.encounter": { team: string; from: string; to: string };
  "reschedule.summary.slot": { team: string; slot: number; from: string; to: string };
  "reschedule.summary.applied.encounter": { from: string; to: string };
  "reschedule.summary.applied.slot": { slot: number; from: string; to: string };
  "reschedule.summary.closed.encounter": { team: string; to: string };
  "reschedule.summary.closed.slot": { team: string; slot: number; to: string };
  "reschedule.respondBy": { date: string };
  "reschedule.proposal": { number: number };
  "reschedule.consent": { actor: string };
  "reschedule.rejection": { actor: string };
  "reschedule.expiredAt": { deadline: string; processed: string };
  "reschedule.resolvedAt": { date: string; actor: string };
  "reschedule.zone": { zone: string };
  "reschedule.create.actingAs": { team: string };
  "reschedule.create.currentStart": { date: string };
  "reschedule.create.blocked.limit_reached": { team: string };
  "reschedule.respondAs": { team: string };
  "reschedule.accept.body": { scope: string; from: string; to: string };
  "reschedule.reject.body": { date: string };
  "reschedule.counter.actingAs": { team: string };
  "reschedule.counter.body": { team: string };
  "reschedule.counter.success": { team: string };
  readonly "encounter.title": { readonly home: string; readonly away: string };
  readonly "encounter.round": { readonly number: number };
  readonly "encounter.roundOf": { readonly number: number; readonly total: number };
  readonly "encounter.timeZone": { readonly zone: string };
  readonly "encounters.list.timeZone": { readonly zone: string };
  readonly "encounters.list.open": { readonly home: string; readonly away: string };
  readonly "encounters.list.slots": { readonly count: number };
  readonly "disputes.list.timeZone": { readonly zone: string };
  readonly "disputes.list.open": { readonly home: string; readonly away: string };
  readonly "disputes.list.kickoff": { readonly when: string };
  readonly "disputes.list.waiting": { readonly since: string };
  readonly "sanctions.detail.points": { readonly count: number };
  readonly "sanctions.detail.matches": { readonly count: number };
  readonly "sanctions.impose.encounterOption": {
    readonly round: number;
    readonly home: string;
    readonly away: string;
  };
  readonly "sanctions.revoke.description": { readonly type: string; readonly target: string };
  readonly "teamPerformance.unmatched": { readonly count: number };
  readonly "teamPerformance.criteria.windowValue": { readonly recent: number };
  readonly "teamPerformance.criteria.eligibilityValue": { readonly minimum: number };
  readonly "teamPerformance.criteria.sourcesValue": {
    readonly approved: number;
    readonly voided: number;
  };
  readonly "teamPerformance.criteria.versions": {
    readonly formula: string;
    readonly normalization: string;
    readonly window: string;
  };
  readonly "teamPerformance.weight": { readonly weight: number };
  readonly "teamPerformance.table.summary": {
    readonly scored: number;
    readonly incomplete: number;
  };
  readonly "teamPerformance.reason.insufficient_sample": {
    readonly count: number;
    readonly minimum: number;
  };
  readonly "teamPerformance.missing": { readonly metrics: string };
  readonly "encounter.slot.label": { readonly slot: number };
  readonly "encounter.slot.clear": { readonly slot: number };
  readonly "encounter.outcome.win": { readonly team: string };
  readonly "encounter.candidates.window": { readonly from: string; readonly to: string };
  readonly "encounter.candidates.updated": { readonly time: string };
  readonly "encounter.candidates.notConnected.side": { readonly team: string };
  readonly "encounter.candidate.label": {
    readonly home: string;
    readonly away: string;
    readonly time: string;
  };
  readonly "encounter.candidate.duration": { readonly minutes: number };
  readonly "encounter.candidate.players": { readonly count: number };
  readonly "encounter.candidate.useIn": { readonly slot: number };
  readonly "encounter.candidate.usedIn": { readonly slot: number };
  readonly "encounter.selection.version": { readonly version: number };
  readonly "encounter.selection.round": { readonly round: number };
  readonly "encounter.selection.deadline": { readonly date: string };
  readonly "encounter.selection.dispute.openedBy": { readonly team: string };
  readonly "encounter.selection.flags.provider_data_incomplete": { readonly match: string };
  readonly "encounter.selection.flags.provider_match_disconnected": { readonly match: string };
  readonly "encounter.selection.proposal.label": {
    readonly sequence: number;
    readonly round: number;
  };
  readonly "encounter.selection.proposal.by": { readonly team: string };
  readonly "encounter.selection.slot.score": {
    readonly slot: number;
    readonly home: string;
    readonly homeGoals: number;
    readonly awayGoals: number;
    readonly away: string;
  };
  readonly "encounter.selection.slot.unmatched": { readonly slot: number };
  readonly "encounter.selection.slot.missing": { readonly slot: number };
  readonly "encounter.selection.slot.match": { readonly match: string };
  readonly "encounter.selection.slot.played": { readonly match: string; readonly time: string };
  readonly "encounter.selection.slot.empty": { readonly slot: number };
  readonly "encounter.selection.conflict": { readonly from: number; readonly to: number };
  readonly "encounter.selection.conflictStale": { readonly from: number };
  readonly "encounter.selection.history.selected": { readonly proposal: string };
  readonly "encounter.selection.history.acknowledged": { readonly count: number };
  readonly "common.seconds": { readonly seconds: number };
  readonly "legal.updated": { readonly date: string };
  readonly "gameData.clubSearch.retryIn": { readonly seconds: number };
  readonly "organizations.profile.slug.useSuggestion": { readonly slug: string };
  readonly "organizations.profile.logo.alt": { readonly name: string };
  readonly "competitions.setup.step": { readonly step: number; readonly total: number };
  readonly "support.retryAfter": { readonly seconds: number };
  readonly "onboarding.shell.stepSummary": {
    readonly current: number;
    readonly label: string;
    readonly total: number;
  };
  readonly "player.gameData.setup.steps.summary": {
    readonly current: number;
    readonly label: string;
    readonly total: number;
  };
  readonly "player.gameData.clubs.meta": { readonly id: string };
  readonly "onboarding.club.search.retry": { readonly seconds: number };
  readonly "onboarding.club.search.loadingStatus": { readonly query: string };
  readonly "onboarding.club.search.empty": { readonly query: string };
  readonly "onboarding.club.search.results": { readonly count: number };
  readonly "onboarding.invitation.retry": { readonly seconds: number };
  readonly "onboarding.review.edit": { readonly label: string };
  readonly "onboarding.review.retry": { readonly seconds: number };
  readonly "player.home.subtitle.activity": { readonly club: string };
  readonly "player.home.hero.next.round": {
    readonly competition: string;
    readonly matchday: number;
  };
  readonly "player.home.invitations.pendingCount": { readonly count: number };
  readonly "player.home.updatedAgo": { readonly time: string };
  readonly "player.statistics.period.summary": { readonly from: string; readonly to: string };
  readonly "player.statistics.matchesCount": { readonly count: number };
  readonly "captain.stats.spotsLeft": { readonly count: number };
  readonly "roster.role.aria": { readonly name: string };
  readonly "roster.role.confirmDescription": {
    readonly name: string;
    readonly role: string;
  };
  readonly "player.statistics.record.hint": { readonly percent: string };
  readonly "player.statistics.assists.hint": { readonly average: string };
  readonly "player.statistics.goals.hint": { readonly average: string };
  readonly "player.statistics.form.winShare": { readonly percent: string };
  readonly "player.statistics.form.winShare.percent": { readonly percent: string };
  readonly "player.statistics.form.wins": { readonly count: number };
  readonly "player.statistics.form.draws": { readonly count: number };
  readonly "player.statistics.form.losses": { readonly count: number };
  readonly "player.statistics.form.unknowns": { readonly count: number };
  readonly "player.statistics.component.points": { readonly points: number };
  readonly "player.statistics.component.confidence": { readonly percent: number };
  readonly "player.statistics.component.weightedMatches": { readonly count: number };
  readonly "player.matches.results.count": { readonly count: number };
  readonly "player.competitions.explore.count": { readonly count: number };
  readonly "player.competitions.explore.card.teams": { readonly count: number };
  readonly "player.competitions.explore.card.teamsOf": {
    readonly count: number;
    readonly max: number;
  };
  readonly "player.competitions.explore.card.organizer": { readonly name: string };
  readonly "player.competitions.explore.card.teamsFull": { readonly count: number };
  readonly "player.competitions.explore.card.startsOn": { readonly date: string };
  readonly "player.competitions.explore.card.endsOn": { readonly date: string };
  readonly "player.competitions.apply.status.pending.description": { readonly team: string };
  readonly "player.competitions.apply.status.approved.description": { readonly team: string };
  readonly "player.competitions.apply.status.rejected.description": { readonly team: string };
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
  readonly "player.matchDetail.rosters.registered": { readonly count: number };
  readonly "player.matchDetail.rosters.playerCount": { readonly count: number };
  readonly "org.home.activity.team": { readonly time: string };
  readonly "org.home.activity.competition": { readonly status: string; readonly time: string };
  readonly "org.home.actions.menu": { readonly name: string };
  readonly "competition.teamStats.summary.updated": { readonly date: string };
  readonly "competition.teamStats.leader.tied": { readonly team: string; readonly count: number };
  readonly "competition.teamStats.leader.partial": { readonly teams: string };
  readonly "competition.teamStats.table.label": { readonly view: string };
  readonly "standings.table.updated": { readonly time: string };
  readonly "standings.table.formula": { readonly version: string };
  readonly "standings.playoffCut": { readonly count: number };
  readonly "standings.swiss.round": { readonly current: number; readonly total: number };
  readonly "standings.swiss.completed": { readonly completed: number; readonly total: number };
  readonly "standings.swiss.byes": { readonly count: number };
  readonly "fixture.timeZone": { readonly zone: string };
  readonly "fixture.round.matchday": { readonly number: number };
  readonly "fixture.round.number": { readonly number: number };
  readonly "fixture.side.winner.semifinal": { readonly order: number };
  readonly "fixture.side.winner.quarterfinal": { readonly order: number };
  readonly "fixture.side.winner.roundOf16": { readonly order: number };
  readonly "fixture.side.winner.matchday": { readonly number: number; readonly order: number };
  readonly "fixture.side.winner.round": { readonly number: number; readonly order: number };
  readonly "fixture.side.groupRank": { readonly place: string; readonly group: string };
  readonly "fixture.side.stageRank": { readonly place: string; readonly stage: string };
  readonly "fixture.slots": { readonly count: number };
  readonly "fixture.group": { readonly group: string };
  readonly "fixture.open": { readonly home: string; readonly away: string };
  readonly "fixture.openAt": {
    readonly home: string;
    readonly away: string;
    readonly date: string;
  };
  readonly "fixture.filters.roundOption": { readonly stage: string; readonly round: string };
  readonly "fixture.encounters": { readonly count: number };
  readonly "fixture.summary": { readonly count: number; readonly dates: number };
  readonly "fixture.month.day": { readonly date: string; readonly count: number };
  readonly "fixture.month.more": { readonly count: number };
  readonly "fixture.month.goTo": { readonly month: string };
  readonly "fixture.rounds.scroll": { readonly stage: string };
  readonly "fixture.round.pending": { readonly number: number };
  readonly "fixture.round.expected": { readonly date: string };
  readonly "fixture.bye": { readonly team: string };
  readonly "fixture.swiss.progress": { readonly paired: number; readonly total: number };
  readonly "fixture.swiss.withdrawn": { readonly teams: string };
  readonly "fixture.generate.description": { readonly count: number };
  readonly "fixture.generate.roundsHint": { readonly recommended: number; readonly max: number };
  readonly "fixture.generate.roundsInvalid": { readonly max: number };
  readonly "fixture.close.title": { readonly number: number };
  readonly "fixture.close.done": { readonly number: number };
  readonly "fixture.withdraw.done": { readonly team: string };
  readonly "settings.emailCurrent": { readonly email: string };
  readonly "settings.emailSent": { readonly email: string };
  readonly "settings.sessionActivity": { readonly signedIn: string; readonly lastActive: string };
  readonly "settings.sessionRevokeLabel": { readonly device: string };
  readonly "settings.deviceOn": { readonly client: string; readonly os: string };
  readonly "settings.deleteBlockerOrganizer": { readonly organization: string };
  readonly "settings.deleteBlockerCaptain": { readonly team: string; readonly competition: string };
  readonly "settings.deleteScheduled": { readonly date: string };
  readonly "settings.deleteConfirmDescription": { readonly date: string };
  readonly "accountDeletion.title": { readonly date: string };
  readonly "portal.header.teams": { readonly count: number };
  readonly "portal.header.timeZone": { readonly zone: string };
  readonly "portal.meta.description": { readonly name: string };
  readonly "portal.calendar.round": { readonly round: number };
  readonly "portal.encounter.label": { readonly home: string; readonly away: string };
  readonly "portal.encounter.score": { readonly score: string };
  readonly "portal.bracket.round": { readonly round: number };
  readonly "portal.bracket.encounter": { readonly order: number };
  readonly "portal.bracket.side.winner": { readonly round: number; readonly order: number };
  readonly "portal.bracket.side.groupRank": { readonly group: string; readonly rank: number };
  readonly "portal.bracket.side.stageRank": { readonly rank: number };
  readonly "portal.rules.teams.range": { readonly min: number; readonly max: number };
  readonly "portal.rules.teams.min": { readonly min: number };
  readonly "portal.rules.roster.value": { readonly count: number };
  readonly "portal.rules.rescheduling.limited": { readonly count: number; readonly hours: number };
  readonly "portal.rules.rescheduling.unlimited": { readonly hours: number };
}

export type ParameterizedMessageKey = keyof MessageParamsByKey;
export type ParameterlessMessageKey = Exclude<MessageKey, ParameterizedMessageKey>;

const en: Catalog = {
  "audit.action.entryRegistered": "Team registered",
  "audit.action.entryApproved": "Entry approved",
  "audit.action.entryRejected": "Entry rejected",
  "audit.action.rosterMemberAdded": "Player added to roster",
  "audit.action.organizationRoleChanged": "Organization role changed",
  "audit.action.permissionGranted": "Permission granted",
  "audit.action.permissionChanged": "Permission changed",
  "audit.action.permissionRevoked": "Permission revoked",
  "audit.action.superuserAssigned": "Superuser assigned",
  "audit.action.superuserRevoked": "Superuser revoked",
  "audit.action.integrityReviewRequired": "Integrity review required",
  "audit.action.alternativeProposed": "Alternative selection proposed",
  "audit.action.reviewStarted": "Review started",
  "audit.action.returnedToSelection": "Selection reopened",
  "audit.action.referenceReuseRejected": "Reused match rejected",
  "audit.action.legacyReviewRequired": "Legacy selection review required",
  "audit.action.confirmationExpired": "Confirmation expired",
  "pages.competition.audit.title": "Audit",
  "pages.competition.audit.subtitle": "Decisions and changes recorded in this competition.",
  "audit.action.organizationCreated": "Organization created",
  "audit.action.competitionCreated": "Competition created",
  "audit.action.competitionPublished": "Competition published",
  "audit.action.teamCreated": "Team created",
  "audit.action.clubConnected": "Club connected",
  "audit.action.fixtureGenerated": "Fixture generated",
  "audit.action.encounterEdited": "Encounter edited",
  "audit.action.teamWithdrawn": "Team withdrawn",
  "audit.action.roundClosed": "Round closed",
  "audit.action.selectionProposed": "Selection proposed",
  "audit.action.selectionConfirmed": "Selection confirmed",
  "audit.action.resultApproved": "Result approved",
  "audit.action.selectionRejected": "Selection rejected",
  "audit.action.disputeOpened": "Dispute opened",
  "audit.action.disputeResolved": "Dispute resolved",
  "audit.action.resultVoided": "Result voided",
  "audit.action.planChanged": "Plan changed",
  "audit.action.sanctionImposed": "Sanction imposed",
  "audit.action.sanctionRevoked": "Sanction revoked",
  "audit.action.syncQueued": "Sync queued",
  "audit.action.syncCompleted": "Sync completed",

  "pages.organization.audit.title": "Audit",
  "pages.organization.audit.subtitle": "Who did what, when and why in your organization.",
  "audit.title": "Audit",
  "audit.filter.label": "Filter audit",
  "audit.filter.competition": "Competition",
  "audit.filter.actor": "Actor",
  "audit.filter.action": "Action",
  "audit.filter.from": "From (UTC)",
  "audit.filter.to": "To (UTC)",
  "audit.filter.rangeError": "The end date must be on or after the start date.",
  "audit.filter.apply": "Apply filters",
  "audit.filter.clear": "Clear filters",
  "audit.table.label": "Audit history",
  "audit.column.date": "Date",
  "audit.column.actor": "Actor",
  "audit.column.action": "Action",
  "audit.column.reason": "Reason",
  "audit.column.object": "Affected object",
  "audit.systemActor": "Actor not recorded",
  "audit.noReason": "No recorded reason",
  "audit.loading": "Loading audit",
  "audit.loadError": "We could not load the audit history.",
  "audit.refreshError": "We could not refresh the audit history. You see the last successful read.",
  "audit.denied.title": "Audit unavailable",
  "audit.denied.description": "You need permission to read this organization’s audit history.",
  "audit.empty.title": "No recorded activity",
  "audit.empty.description": "Decisions in your organization and competitions will appear here.",
  "audit.filteredEmpty.title": "No results match these filters",
  "audit.filteredEmpty.description": "Change or clear the filters to read the history.",
  "audit.order": "Newest first",
  "audit.previous": "Previous",
  "audit.next": "Next",
  "audit.competitionNavigation": "Competition views",
  "audit.correlation": ({ id }) => `Correlation ${id}`,

  "bracket.documentTitle": "Bracket",
  "bracket.loading": "Loading the bracket",
  "bracket.error": "We couldn't load the bracket.",
  "bracket.refreshError": "We couldn't refresh the bracket. You're seeing the last good read.",
  "bracket.empty.title": "No bracket yet",
  "bracket.empty.description":
    "Once the fixture is generated, you'll see every knockout round here, through to the final.",
  "bracket.noBracket.title": "This competition has no knockout rounds",
  "bracket.noBracket.description":
    "Its format is played by matchday. Check each encounter in the schedule.",
  "bracket.calendarLink": "View schedule",
  "bracket.facts": "Stage summary",
  "bracket.rounds.one": "1 round",
  "bracket.rounds.other": ({ count }) => `${count} rounds`,
  "bracket.encounters.one": "1 tie",
  "bracket.encounters.other": ({ count }) => `${count} ties`,
  "bracket.byes.one": "1 bye",
  "bracket.byes.other": ({ count }) => `${count} byes`,
  "bracket.twoLegs": "Two legs",
  "bracket.hint": "Left to right. Swipe the bracket or open the list by round.",
  "bracket.canvasLabel": ({ stage }) => `Scrollable bracket: ${stage}`,
  "bracket.unlinked.one": "1 place doesn't say which tie it comes from, so it has no line.",
  "bracket.unlinked.other": ({ count }) =>
    `${count} places don't say which tie they come from, so they have no line.`,
  "bracket.node.number": ({ number }) => `Tie ${number}`,
  "bracket.node.label": ({ away, home, kickoff, number, round, status }) =>
    `${round}, tie ${number}: ${home} vs ${away}. ${kickoff}. ${status}.`,
  "bracket.node.outsideFilter": "Outside the filter.",
  "bracket.status.scheduled": "Scheduled",
  "bracket.status.pending": "Opponent to be decided",
  "bracket.status.bye": "No opponent",
  "bracket.filter.team": "Follow a team",
  "bracket.filter.allTeams": "All teams",
  "bracket.filter.summary": ({ shown, total }) =>
    `${shown} of ${total} ties highlighted. The bracket keeps its shape.`,
  "bracket.filter.clear": "Clear filter",
  "bracket.list.toggle": "View ties as a list",
  "bracket.list.matchup": ({ away, home }) => `${home} vs ${away}`,
  "bracket.list.noneForTeam": "This team has no ties in this round.",

  "profile.title": "My profile",
  "profile.description": "Your Futrob identity and game accounts.",
  "profile.name": "Display name",
  "profile.email": "Account email",
  "profile.identityHint": "This email identifies your sign-in account.",
  "profile.initialsHint": "Your initials are generated from your display name.",
  "profile.save": "Save profile",
  "profile.saved": "Profile saved.",
  "profile.error": "We could not save your profile. Your changes are still here.",
  "profile.loading": "Loading your profile\u2026",
  "profile.loadError": "We could not load your account. Try again.",
  "profile.games": "Game accounts",
  "profile.gamesEmpty": "You have not added a game account yet.",
  "profile.gamesError": "We could not load your game accounts.",
  "profile.gameData": "Manage game data",
  "profile.statistics": "View my statistics",
  "account.retry": "Try again",
  "account.saving": "Saving\u2026",
  "account.close": "Close",
  "settings.title": "Account",
  "settings.description": "Preferences, security, sessions and account deletion.",
  "settings.sections": "Account sections",
  "settings.section.preferences": "Preferences",
  "settings.section.security": "Security",
  "settings.section.sessions": "Sessions",
  "settings.section.delete": "Delete account",
  "settings.language": "Language",
  "settings.languageHint": "Applied when you choose it and remembered in this browser.",
  "settings.sidebarLayout": "Sidebar",
  "settings.sidebarLayoutHint": "Applied when you choose it and saved to your account.",
  "settings.sidebarLayoutNavigation": "Navigation",
  "settings.sidebarLayoutPendingQueue": "With pending items",
  "settings.saved": "Saved.",
  "settings.languageError":
    "We could not change the language. The previous one stays; choose again.",
  "settings.sidebarLayoutError":
    "We could not save the sidebar. The previous one stays; choose again.",
  "settings.email": "Email",
  "settings.emailCurrent": "You sign in with {email}.",
  "settings.emailNew": "New email",
  "settings.emailHint":
    "We will send a link to the new address. Until you open it, you keep signing in with the current one.",
  "settings.emailSubmit": "Change email",
  "settings.emailSending": "Sending link\u2026",
  "settings.emailSent": "Link sent to {email}. Open it to confirm the change.",
  "settings.emailInvalid": "Enter a valid email.",
  "settings.emailUnchanged": "That is already your email.",
  "settings.emailUnavailable": "Changing email is not available yet. Your email did not change.",
  "settings.emailError": "We could not request the email change. Try again.",
  "settings.password": "Password",
  "settings.passwordHint": "Changing it signs out your other sessions.",
  "settings.currentPassword": "Current password",
  "settings.newPassword": "New password",
  "settings.confirmPassword": "Repeat new password",
  "settings.passwordSubmit": "Change password",
  "settings.passwordChanging": "Changing password\u2026",
  "settings.passwordChanged": "Password changed. We signed out your other sessions.",
  "settings.passwordInvalid":
    "Enter your current password and a new password of 8 to 128 characters. Both new passwords must match.",
  "settings.passwordError":
    "We could not change your password. Check your current password and try again.",
  "settings.emailNotifications": "Email notifications",
  "settings.emailNotificationsAll": "All notifications",
  "settings.emailNotificationsCritical": "Only those that need action",
  "settings.emailNotificationsHint":
    "Pending actions and decisions always arrive. Emails use the language chosen here.",
  "settings.emailNotificationsUnavailable": "Unavailable right now",
  "settings.emailNotificationsLoading": "Loading\u2026",
  "settings.emailNotificationsError":
    "We could not save your email notifications. The previous choice stays; choose again.",
  "emailUnsubscribe.title": "Email notifications",
  "emailUnsubscribe.description":
    "Stop reminders and updates. Pending actions and decisions will still arrive.",
  "emailUnsubscribe.confirm": "Stop them",
  "emailUnsubscribe.confirming": "Saving\u2026",
  "emailUnsubscribe.done":
    "Done. You will no longer get reminders or updates by email. You can turn them back on in Settings.",
  "emailUnsubscribe.invalid": "This link is not valid. Change your notifications in Settings.",
  "emailUnsubscribe.error": "We could not save the change. Try again.",
  "emailUnsubscribe.home": "Go to Futrob",
  "settings.sessionsHint":
    "Devices where your account is open. Signing a session out ends it immediately.",
  "settings.sessionsLoading": "Loading sessions\u2026",
  "settings.sessionsError": "We could not load your sessions.",
  "settings.sessionsOnlyThis": "Only this session is open.",
  "settings.sessionCurrent": "This session",
  "settings.sessionActivity": "Signed in {signedIn} · Last active {lastActive}",
  "settings.sessionRevoke": "Sign out",
  "settings.sessionRevokeLabel": "Sign out {device}",
  "settings.sessionsRevokeOthers": "Sign out the others",
  "settings.sessionsRevokeError": "We could not sign that session out. Try again.",
  "settings.deviceUnknown": "Unknown device",
  "settings.deviceApp": "Futrob app",
  "settings.deviceOn": "{client} on {os}",
  "settings.deleteIntro":
    "Your account is deleted 30 days after you ask. Until then you can cancel by signing in.",
  "settings.deleteRemovedTitle": "What is deleted",
  "settings.deleteRemoved":
    "Your name, email, password and sessions; your game accounts and personal statistics; your memberships in organizations and in rosters of running competitions.",
  "settings.deleteKeptTitle": "What is kept",
  "settings.deleteKept":
    "Official results, competition statistics and the audit trail, without your name: they show \u201cDeleted account\u201d.",
  "settings.deleteLoading": "Checking whether you can delete the account\u2026",
  "settings.deleteStatusError": "We could not check your account status.",
  "settings.deleteBlockedTitle": "Before you delete the account",
  "settings.deleteBlockerOrganizer":
    "You are the only organizer of {organization}. Give the organizer role to someone else or archive its active competitions.",
  "settings.deleteBlockerCaptain":
    "You captain {team} in {competition}. Hand the captaincy to another player.",
  "settings.deleteScheduled": "Your account will be deleted on {date}.",
  "settings.deleteStart": "Delete account",
  "settings.deleteConfirmTitle": "Delete your account?",
  "settings.deleteConfirmDescription":
    "We will sign out every session, this one included, and delete the account on {date}. Enter your password to confirm.",
  "settings.deletePassword": "Password",
  "settings.deleteConfirm": "Delete my account",
  "settings.deleting": "Scheduling deletion\u2026",
  "settings.deleteKeep": "Keep my account",
  "settings.deleteWrongPassword": "The password does not match. Your account is still active.",
  "settings.deleteBlocked": "There are open responsibilities. Review them in this section.",
  "settings.deleteError": "We could not schedule the deletion. Your account is still active.",
  "accountDeletion.title": "Your account will be deleted on {date}",
  "accountDeletion.body":
    "You asked to delete your account. Until that date you can cancel and everything stays as it was.",
  "accountDeletion.cancel": "Cancel deletion",
  "accountDeletion.cancelling": "Cancelling\u2026",
  "accountDeletion.cancelError": "We could not cancel the deletion. Try again.",
  "accountDeletion.signOut": "Sign out",
  "profile.manageAccount": "Change email or password",
  "feedback.title": "Send feedback",
  "feedback.description": "Tell us what to improve or what went wrong.",
  "feedback.type": "What would you like to share?",
  "feedback.problem": "A problem",
  "feedback.idea": "An idea",
  "feedback.message": "Your message",
  "feedback.placeholder": "Tell us what happened or what you would like to improve\u2026",
  "feedback.expected": "What did you expect to happen?",
  "feedback.optional": "Optional",
  "feedback.reply": "You may contact me about this message",
  "feedback.context": "Include the current page",
  "feedback.contextHint": "Only the path is included, without query parameters or session data.",
  "feedback.unavailable": "Feedback sending is not available yet. Your message has not been sent.",
  "feedback.send": "Send feedback",

  "pages.organization.plan.title": "Plan and usage",
  "pages.organization.plan.subtitle":
    "What your organization's plan includes and how much you have used this month.",
  "billing.plan.name.free": "Free",
  "billing.plan.name.pro": "Pro",
  "billing.plan.name.league": "League",
  "billing.plan.current": "Current plan",
  "billing.plan.status.default": "Default plan",
  "billing.plan.status.active": "Active",
  "billing.plan.status.trialing": "Trial until {date}",
  "billing.plan.status.past_due": "Payment due",
  "billing.plan.status.lapsed": "{plan} ended; Free applies",
  "billing.request.hint":
    "Requesting a plan charges nothing: we activate it by hand and your plan changes when we do.",
  "billing.request.action": "Request {plan}",
  "billing.request.pending":
    "You asked for the {plan} plan on {date}. We'll activate it by hand; until then you stay on {current}.",
  "billing.request.cancel": "Cancel request",
  "billing.request.error": "We couldn't record your request. Try again.",
  "billing.request.cancelError": "We couldn't cancel your request. Try again.",
  "billing.request.staffOnly": "Only the organizer can ask for a plan change.",
  "billing.plan.topPlan": "You are on the most complete plan.",
  "billing.plan.compare": "Compare plans",
  "billing.usage.title": "Usage",
  "billing.usage.description":
    "Limits only stop new actions. Anything already under way finishes as usual.",
  "billing.usage.activeCompetitions": "Active competitions",
  "billing.usage.staffMembers": "Staff",
  "billing.usage.providerSyncJobs": "EA syncs this month",
  "billing.usage.value": "{used} of {limit}",
  "billing.usage.unlimited": "{used} · no limit",
  "billing.usage.resets": "Resets on {date}",
  "billing.usage.fairUse": "Fair use",
  "billing.usage.reached.activeCompetitions":
    "You reached the active competition limit. Finish or archive one to create another.",
  "billing.usage.reached.staffMembers":
    "You cannot add more staff on this plan. Current staff keep their role.",
  "billing.usage.reached.providerSyncJobs":
    "You used this month's syncs. Encounters in progress resolve with the matches already synced.",
  "billing.features.title": "Included in your plan",
  "billing.features.included": "Included",
  "billing.features.notIncluded": "Not included",
  "billing.features.formats": "Formats: {formats}",
  "billing.features.teamsPerCompetition": "Up to {count} teams per competition",
  "billing.features.teamsUnlimited": "No team limit per competition",
  "billing.features.automaticProviderSync": "Automatic EA sync",
  "billing.features.performanceRanking": "0–100 performance ranking",
  "billing.features.premiumAnalytics": "Premium team and player analytics",
  "billing.features.organizerAnalytics.none": "Organizer analytics",
  "billing.features.organizerAnalytics.basic": "Basic organizer analytics",
  "billing.features.organizerAnalytics.full": "Full organizer analytics",
  "billing.features.portalBranding.futrob": "Public portal with Futrob branding",
  "billing.features.portalBranding.logo_colors": "Public portal with your logo and colors",
  "billing.features.portalBranding.advanced": "Public portal with advanced branding",
  "billing.features.notifications": "Notifications: {channels}",
  "billing.channel.web": "web",
  "billing.channel.email": "email",
  "billing.channel.announcements": "announcements",
  "billing.changes.title": "Plan changes",
  "billing.changes.empty": "No plan changes yet.",
  "billing.changes.change": "Change",
  "billing.changes.reason": "Reason",
  "billing.changes.date": "Date",
  "billing.changes.assigned": "{plan} ({status})",
  "billing.changes.from": "{before} → {after}",
  "billing.changes.status.active": "active",
  "billing.changes.status.trialing": "trial",
  "billing.changes.status.past_due": "payment due",
  "billing.changes.status.canceled": "canceled",
  "billing.loading": "Loading the plan…",
  "billing.error": "We couldn't load the plan.",
  "billing.accessError": "We couldn't check your access to the plan.",
  "billing.forbidden.title": "You can't view the plan",
  "billing.forbidden.description":
    "Only the organizer and staff see the organization's plan and usage.",
  "billing.upsell.action": "View plan and usage",
  "teamPerformance.viewStandings": "View standings",
  "billing.upsell.competitions.plan_limit_reached":
    "Your plan allows no more active competitions. Finish or archive one, or change plans.",
  "billing.upsell.competitions.format_not_in_plan":
    "Your plan doesn't include this format. Pick league or knockout, or change plans.",
  "billing.upsell.organizations.staff_limit_reached":
    "Your plan allows no more staff. You can invite the person as a member.",
  "billing.upsell.game_data.sync_quota_exhausted":
    "You used this month's EA syncs. Matches already synced stay available.",
  "billing.upsell.statistics.performance_ranking_not_in_plan":
    "The performance ranking is part of Pro and League.",
  "billing.upsell.generic": "Your plan doesn't include this action.",
  "billing.rankingUpsell.title": "The performance ranking is on Pro and League",
  "billing.rankingUpsell.description":
    "Your current plan doesn't include it. The official competition table stays available to everyone.",
  "pricing.meta.title": "Pricing | Futrob",
  "pricing.meta.description": "Free, Pro and League plans to run EA SPORTS FC Clubs competitions.",
  "pricing.title": "Plans for every competition",
  "pricing.subtitle": "Start free and move up a plan as your operation grows.",
  "pricing.unavailable": "We couldn't load the plans. Try again in a few minutes.",
  "pricing.recommended": "Recommended",
  "pricing.tagline.free": "For your first competition.",
  "pricing.tagline.pro": "For organizers running several competitions.",
  "pricing.tagline.league": "For large, multi-league operations.",
  "pricing.perMonthUsd": "USD a month",
  "pricing.competitions": "{count} active competitions",
  "pricing.competitionsOne": "1 active competition",
  "pricing.competitionsUnlimited": "No active competition limit",
  "pricing.format": "Format: {format}",
  "pricing.cta.free": "Start free",
  "pricing.cta.paid": "Create account",
  "pricing.note.free": "No card needed.",
  "pricing.note.paid":
    "You start on Free, request {plan} from your organization and we activate it by hand.",
  "pricing.comingSoon": "Coming soon",
  "pricing.perMonth": "{count} syncs a month",
  "pricing.fairUse": "{count} syncs a month (fair use)",
  "pricing.staff": "Up to {count} staff",
  "pricing.staffUnlimited": "No staff limit",
  "pricing.integrity.title": "Competitive integrity doesn't depend on your plan",
  "pricing.integrity.subtitle":
    "Everything that decides an official result works the same on Free, Pro and League.",
  "pricing.integrity.listLabel": "Included in every plan",
  "pricing.integrity.selection": "Official match selection",
  "pricing.integrity.confirmation": "Confirmation between captains",
  "pricing.integrity.disputes": "Disputes",
  "pricing.integrity.reschedule": "Rescheduling",
  "pricing.integrity.officialization": "Result officialization",
  "pricing.integrity.note":
    "If you downgrade or run out of quota, only new actions are blocked. Competitions in progress still finish.",
  "landing.nav.pricing": "Pricing",
  "competitions.reschedule.expiryLabel": "Proposal response window (hours)",
  "competitions.reschedule.expiryHelp":
    "Between 1 and 72 hours from each proposal. Once it expires, the organizer resolves the request.",
  "competitions.reschedule.expiryInvalid": "Enter whole hours between 1 and 72.",
  "competitionRules.documentTitle": "Rules",
  "competitionRules.loading": "Loading the rules…",
  "competitionRules.error": "We couldn't load the rules.",
  "competitionRules.refreshError":
    "We couldn't refresh the rules. What you see may be out of date.",
  "competitionRules.forbidden.title": "You don't have access to the rules",
  "competitionRules.forbidden.description":
    "Ask the organizer to give you access to this competition.",
  "competitionRules.notFound.title": "We couldn't find this competition",
  "competitionRules.notFound.description":
    "It may have been removed, or the link may be incorrect.",
  "competitionRules.edit": "Edit rules",
  "competitionRules.status.draft": "Draft",
  "competitionRules.status.registration": "Registration open",
  "competitionRules.status.published": "Published",
  "competitionRules.status.paused": "Paused",
  "competitionRules.status.finished": "Finished",
  "competitionRules.status.archived": "Archived",
  "competitionRules.notice.draft":
    "These rules are a draft and can change until the competition is published.",
  "competitionRules.notice.locked":
    "The competition structure no longer accepts changes, so these rules are read-only.",
  "competitionRules.format.title": "Format",
  "competitionRules.format.label": "Competition type",
  "competitionRules.format.league": "League",
  "competitionRules.format.knockout": "Knockout",
  "competitionRules.format.groups-knockout": "Groups + knockout",
  "competitionRules.format.league-playoffs": "League + playoffs",
  "competitionRules.format.swiss": "Swiss system",
  "competitionRules.format.teams": "Teams",
  "competitionRules.format.teamsRange": "{min} to {max}",
  "competitionRules.format.teamsAtLeast": "From {min}",
  "competitionRules.stage.league": "League",
  "competitionRules.stage.groups": "Groups",
  "competitionRules.stage.knockout": "Knockout",
  "competitionRules.stage.playoffs": "Playoffs",
  "competitionRules.stage.swiss": "Swiss stage",
  "competitionRules.stage.description": "Match rules for this stage.",
  "competitionRules.scoring.title": "Scoring",
  "competitionRules.scoring.win": "Win",
  "competitionRules.scoring.draw": "Draw",
  "competitionRules.scoring.loss": "Loss",
  "competitionRules.encounter.title": "Encounter",
  "competitionRules.encounter.matches": "Matches per tie",
  "competitionRules.encounter.resolution": "Resolution",
  "competitionRules.encounter.independent": "Each match counts on its own",
  "competitionRules.encounter.aggregate": "Aggregate score",
  "competitionRules.value.matches": (params) =>
    count(params) === 1 ? "1 match" : `${count(params)} matches`,
  "competitionRules.value.hours": (params) =>
    count(params) === 1 ? "1 hour" : `${count(params)} hours`,
  "competitionRules.value.players": (params) =>
    count(params) === 1 ? "1 player" : `${count(params)} players`,
  "competitionRules.reschedule.title": "Rescheduling",
  "competitionRules.reschedule.allowed": "Rescheduling",
  "competitionRules.reschedule.allowedYes": "Allowed",
  "competitionRules.reschedule.allowedNo": "Rescheduling is not allowed",
  "competitionRules.reschedule.max": "Maximum per team",
  "competitionRules.reschedule.unlimited": "No limit",
  "competitionRules.reschedule.notice": "Minimum notice",
  "competitionRules.reschedule.expiry": "Proposal response window",
  "competitionRules.reschedule.opponent": "Opponent approval",
  "competitionRules.reschedule.organizer": "Organizer approval",
  "competitionRules.reschedule.required": "Required",
  "competitionRules.reschedule.notRequired": "Not required",
  "competitionRules.roster.title": "Roster",
  "competitionRules.roster.max": "Maximum players",
  "competitionRules.roster.default": "{count} (default limit)",
  "competitionRules.platform.title": "Platform rules",
  "competitionRules.platform.description": "They apply the same way in every competition.",
  "competitionRules.tiebreaks.title": "Tiebreakers",
  "competitionRules.tiebreaks.description": "Applied in this order.",
  "competitionRules.tiebreaks.points": "Points",
  "competitionRules.tiebreaks.buchholz": "Buchholz",
  "competitionRules.tiebreaks.goalDifference": "Goal difference",
  "competitionRules.tiebreaks.goalsFor": "Goals for",
  "competitionRules.awayGoals": "Away goals",
  "competitionRules.awayGoalsOff": "Not applied",
  "competitionRules.results.title": "Result validation",
  "competitionRules.results.confirmation": "Opponent confirmation",
  "competitionRules.results.window": "Time to respond",
  "competitionRules.results.windowValue": "24 hours",
  "competitionRules.results.fallback":
    "If the opponent doesn't respond in time, the result goes to organizer review.",
  "competitionRules.results.officialOnly":
    "Only an approved official result counts toward standings and rankings.",
  "reschedule.title": "Rescheduling",
  "reschedule.description":
    "Review proposals and resolve escalated requests. Silence never accepts a change.",
  "reschedule.loading": "Loading reschedule requests…",
  "reschedule.empty": "No reschedule requests",
  "reschedule.emptyHelp": "Requests and their decisions will appear here.",
  "reschedule.forbidden": "You do not have access to the reschedule history.",
  "reschedule.error": "We could not load the reschedule requests.",
  "reschedule.refresh": "Refresh reschedule requests",
  "reschedule.refreshFailed":
    "We could not refresh the history. The displayed data may have changed.",
  "reschedule.paused": "Refresh the reschedule requests to send. Your draft is kept.",
  "reschedule.status.open": "In negotiation",
  "reschedule.status.accepted": "Schedule applied by consent",
  "reschedule.status.rejected": "Rejected",
  "reschedule.status.cancelled": "Cancelled",
  "reschedule.status.expired": "Expired",
  "reschedule.status.escalated": "Escalated to the organizer",
  "reschedule.status.resolved_by_organizer": "Resolved by the organizer",
  "reschedule.scope.encounter": "Entire encounter",
  "reschedule.scope.slot": "Match {slot}",
  "reschedule.requestedBy": "Requested by {team}",
  "reschedule.proposedBy": "Proposal from {team}",
  "reschedule.proposedStart": "Proposed kickoff",
  "reschedule.deadline": "Response deadline: {date}",
  "reschedule.summary.encounter": "{team} proposes moving the whole encounter from {from} to {to}.",
  "reschedule.summary.slot": "{team} proposes moving match {slot} from {from} to {to}.",
  "reschedule.summary.applied.encounter": "The whole encounter moved from {from} to {to}.",
  "reschedule.summary.applied.slot": "Match {slot} moved from {from} to {to}.",
  "reschedule.summary.closed.encounter": "{team} proposed moving the whole encounter to {to}.",
  "reschedule.summary.closed.slot": "{team} proposed moving match {slot} to {to}.",
  "reschedule.respondBy": "Respond by {date}.",
  "reschedule.history": "Proposal and decision history",
  "reschedule.proposal": "Proposal {number}",
  "reschedule.consent": "Consent from {actor}",
  "reschedule.rejection": "Rejection from {actor}",
  "reschedule.organizer": "Organizer",
  "reschedule.system": "System",
  "reschedule.expiredAt":
    "Response window closed at {deadline}; escalation processed at {processed}.",
  "reschedule.resolvedAt": "Resolution recorded at {date} by {actor}.",
  "reschedule.noPermission":
    "Only an operator with permission to resolve can close this escalated request.",
  "reschedule.resolve": "Resolve escalated request",
  "reschedule.outcome": "Outcome",
  "reschedule.outcome.schedule_set": "Set a new date",
  "reschedule.outcome.schedule_kept": "Keep the schedule",
  "reschedule.outcome.walkover_intended": "Record walkover intention",
  "reschedule.keepHelp":
    "Keeps the current schedule and closes the request without consuming allowance.",
  "reschedule.setHelp":
    "Applies the new date to the requested scope and consumes allowance from the Team that opened the request.",
  "reschedule.walkoverHelp":
    "Records an intention only. It creates no official result and changes no statistics, standings or bracket.",
  "reschedule.reason": "Resolution reason",
  "reschedule.reasonRequired": "Enter a reason to close the request.",
  "reschedule.newStart": "New date and time",
  "reschedule.zone": "Competition time: {zone}",
  "reschedule.dateInvalid": "Enter a valid date in the competition time zone.",
  "reschedule.winningTeam": "Winning Team for the intention",
  "reschedule.winnerRequired": "Choose a winning Team to record the intention.",
  "reschedule.save": "Save resolution",
  "reschedule.saving": "Saving resolution…",
  "reschedule.success": "Resolution saved. The history reflects the closed request.",
  "reschedule.conflict":
    "The request changed. The history has been refreshed; review its state before resolving again.",
  "reschedule.currentStart": "Current kickoff",
  "reschedule.preview": "Saved as",
  "reschedule.create.open": "Request reschedule",
  "reschedule.create.title": "New reschedule request",
  "reschedule.create.team": "Requesting Team",
  "reschedule.create.actingAs": "You request on behalf of {team}",
  "reschedule.create.scope": "What moves",
  "reschedule.create.currentStart": "Now: {date}",
  "reschedule.create.reason": "Reason for the rival",
  "reschedule.create.reasonRequired": "Enter a reason for the rival.",
  "reschedule.create.help":
    "The rival must accept before the deadline. If they do not answer, the request goes to the organizer: silence is not acceptance.",
  "reschedule.create.submit": "Send request",
  "reschedule.create.sending": "Sending request…",
  "reschedule.create.success": "Request sent. The schedule stays the same until the rival accepts.",
  "reschedule.create.blocked.permission":
    "Only a captain of a Team in this encounter can request a reschedule.",
  "reschedule.create.blocked.rescheduling_disabled":
    "This competition does not allow rescheduling.",
  "reschedule.create.blocked.limit_reached": "{team} has used all its reschedules.",
  "reschedule.create.blocked.active_request_exists":
    "An active request already covers this kickoff.",
  "reschedule.create.blocked.result_protected":
    "A protected result selection prevents changes to this kickoff.",
  "reschedule.recovery.review":
    "The proposal changed. Review the current proposal before answering.",
  "reschedule.recovery.windowClosed":
    "Your answer arrived after the deadline and was not recorded. The organizer decides the request.",
  "reschedule.recovery.resultProtected":
    "This kickoff has an approved result and can no longer move.",
  "reschedule.recovery.disabled": "This competition no longer allows rescheduling.",
  "reschedule.recovery.limitReached": "Your Team has used all its reschedules.",
  "reschedule.recovery.permission":
    "You no longer have permission for this action. The list has been refreshed.",
  "reschedule.recovery.activeRequest":
    "An active request already covers this kickoff. Review it in the list.",
  "reschedule.recovery.noticeProposed":
    "The new date does not meet the minimum notice. Choose a later date.",
  "reschedule.recovery.noticeCurrent":
    "The match is too close to reschedule; the current kickoff stays.",
  "reschedule.recovery.acceptNotice":
    "The proposed date no longer meets the minimum notice. Counter with another date or reject the proposal.",
  "reschedule.recovery.acceptPast":
    "The proposed date has passed. Counter with another date or reject the proposal.",
  "reschedule.recovery.dateRejected": "Choose a future date that differs from the current kickoff.",
  "reschedule.recovery.network":
    "We could not send the action. Try again; it will not apply twice.",
  "reschedule.respondAs": "You respond as {team}",
  "reschedule.accept.open": "Accept",
  "reschedule.accept.title": "Accept the proposal",
  "reschedule.accept.body": "{scope} moves from {from} to {to}.",
  "reschedule.accept.submit": "Confirm acceptance",
  "reschedule.accept.sending": "Accepting…",
  "reschedule.accept.success":
    "Acceptance recorded. The request status shows whether the schedule has moved.",
  "reschedule.reject.open": "Reject",
  "reschedule.reject.title": "Reject the proposal",
  "reschedule.reject.body": "The current schedule stays: {date}.",
  "reschedule.reject.reason": "Reason (optional)",
  "reschedule.reject.submit": "Confirm rejection",
  "reschedule.reject.sending": "Rejecting…",
  "reschedule.reject.success": "Proposal rejected. The current schedule stays.",
  "reschedule.counter.open": "Counter",
  "reschedule.counter.title": "Counter with another date",
  "reschedule.counter.actingAs": "You counter as {team}",
  "reschedule.counter.body": "{team} will need to consent again.",
  "reschedule.counter.reason": "Counter reason",
  "reschedule.counter.reasonRequired": "Enter a reason for the counter.",
  "reschedule.counter.submit": "Send counter",
  "reschedule.counter.sending": "Sending counter…",
  "reschedule.counter.success": "Counter sent. {team} must answer before the deadline.",
  "reschedule.blocked.response_window_closed":
    "The response window closed. The request goes to the organizer; silence is not acceptance.",
  "reschedule.blocked.own_proposal": "Your Team made this proposal. Wait for the rival's answer.",
  "reschedule.blocked.permission":
    "Only the rival captain or the organizer can answer this proposal.",
  "reschedule.blocked.already_consented": "You already consented to this proposal.",
  "reschedule.blocked.rescheduling_disabled":
    "The competition does not allow rescheduling, so you cannot accept or counter.",
  "reschedule.blocked.result_protected":
    "This kickoff has an approved result, so you cannot accept or counter.",
  "reschedule.stale":
    "The proposal changed while you were answering. Cancel and review the current proposal.",
  "errors.scheduling.schedule_change_response_window_closed":
    "The response window closed. The organizer must resolve the request.",
  "errors.scheduling.schedule_change_not_escalated":
    "The request has not yet escalated for resolution.",
  "errors.scheduling.invalid_schedule_change_resolution":
    "Check the outcome, reason and Team for this resolution.",
  "errors.scheduling.schedule_change_concurrency_conflict":
    "The request changed. Refresh the history before resolving.",
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
  "notFound.title": "We couldn't find this page",
  "notFound.description": "The link may be mistyped, or the page no longer exists.",
  "notFound.visitor.action": "Back to home",
  "notFound.member.action": "Go to your space",
  "routeError.title": "Something went wrong",
  "routeError.description": "An unexpected failure happened. You can try this page again.",
  "legal.nav.aria": "Legal documents",
  "legal.nav.terms": "Terms of service",
  "legal.nav.privacy": "Privacy policy",
  "legal.nav.refunds": "Refunds",
  "legal.related": "Other documents",
  "legal.signup.lead": "By creating an account you accept the",
  "legal.signup.joiner": " and the ",
  "legal.signup.end": ".",
  "legal.draft.title": "Draft pending legal review",
  "legal.draft.body":
    "This text describes how Futrob works today. It is not legal advice and may change before it is published as a final policy.",
  "legal.updated": ({ date }) => `Last updated: ${date}`,
  "legal.terms.meta.title": "Terms of service",
  "legal.terms.meta.description": "Terms for using Futrob to run EA SPORTS FC Clubs competitions.",
  "legal.terms.title": "Terms of service",
  "legal.terms.description": "Account rules, acceptable use, and how Futrob treats EA data.",
  "legal.terms.service.title": "The service",
  "legal.terms.service.body":
    "Futrob is a Davion Software product for operating EA SPORTS FC Clubs competitions. It is available in Spanish and English. Creating an account means you accept these terms as published.",
  "legal.terms.accounts.title": "Accounts",
  "legal.terms.accounts.body":
    "You need an account with an email and a password. You are responsible for what you do with it. Do not share access or impersonate someone else. If you see misuse, tell the operator.",
  "legal.terms.results.title": "Competitions and official results",
  "legal.terms.results.body":
    "A match observed in EA is not official in Futrob until a captain selects it and the result is approved. Syncing with EA never officializes a result. Only approved official results update standings, rankings, and the public portal.",
  "legal.terms.use.title": "Acceptable use",
  "legal.terms.use.body":
    "Use Futrob to organize and play competitions honestly. Do not fake results, abuse invitations, attack the service, or use other participants' data outside the competition. The operator may suspend an account that breaks these rules.",
  "legal.terms.ea.title": "EA data",
  "legal.terms.ea.body":
    "EA Clubs data are observations from the provider. Futrob does not ask for or store EA login credentials. EA SPORTS and FC Clubs are trademarks of their owners; Futrob is not affiliated with or endorsed by EA.",
  "legal.terms.liability.title": "Liability",
  "legal.terms.liability.body":
    "The service is provided as is, to the extent the law allows. Futrob does not warrant that EA will be available, that a sync will match what you saw in the game, or that a competition will finish a particular way. This section is a draft and does not limit rights that cannot be limited.",
  "legal.terms.changes.title": "Changes",
  "legal.terms.changes.body":
    "We may update these terms when the product changes. The last-updated date is at the top. If a change is material, we will note it in the product once there is a channel to tell you.",
  "legal.privacy.meta.title": "Privacy policy",
  "legal.privacy.meta.description":
    "What Futrob stores, how it uses EA observations, and how to ask for account deletion.",
  "legal.privacy.title": "Privacy policy",
  "legal.privacy.description": "What we store, why, and how you can ask us to delete your account.",
  "legal.privacy.who.title": "Who we are",
  "legal.privacy.who.body":
    "Futrob is operated by Davion Software. We process data so you can create an account, join organizations and competitions, and see official results.",
  "legal.privacy.data.title": "Data we store",
  "legal.privacy.data.body":
    "Account: name, email, and the password hash (Better Auth). Actor profile, organizations, competitions, teams and rosters you create or join, invitations, activity, and plan entitlements assigned to your organization.",
  "legal.privacy.data.body2":
    "We do not sell this data. We use it to run the product, diagnose failures, and apply the rules of the competition you organize or play.",
  "legal.privacy.ea.title": "EA data",
  "legal.privacy.ea.body":
    "If you associate a club or a game account, we store the identifiers you declare and match observations from the EA Clubs API. Futrob does not ask for or store EA usernames or passwords.",
  "legal.privacy.providers.title": "Providers",
  "legal.privacy.providers.body":
    "Cloudflare (web, auth, and file storage), Railway (product API and Postgres), and Sentry (error diagnostics in production). Transactional email will use an email provider when that channel ships; we do not send that mail today.",
  "legal.privacy.retention.title": "Retention",
  "legal.privacy.retention.body":
    "We keep data while the account is open. Some competition records may remain if other participants still need them (for example an official result). Backups are kept for a limited period and then rotated.",
  "legal.privacy.deletion.title": "Account deletion",
  "legal.privacy.deletion.body":
    "You can ask us to delete your account from your profile when that flow ships. Until then, ask the operator for deletion from the account or the support channel Futrob publishes.",
  "legal.privacy.deletion.body2":
    "Deleting access removes your profile and account data. We will keep competition records that other participants still need, such as approved official results and rosters of a team still in play.",
  "legal.privacy.contact.title": "Contact",
  "legal.privacy.contact.body":
    "Write to the Futrob operator (Davion Software) from the account or the support channel published in the product. Do not invent an email address: when the transactional channel exists, we will list it here.",
  "legal.refunds.meta.title": "Refunds",
  "legal.refunds.meta.description":
    "Futrob does not charge cards in this phase. How a refund will be handled when charges exist.",
  "legal.refunds.title": "Refunds",
  "legal.refunds.description":
    "There are no automated charges in the current product. This page will exist for the payments provider when they do.",
  "legal.refunds.current.title": "Current product",
  "legal.refunds.current.body":
    "In this phase Futrob does not charge cards or process automated payments. Plans are assigned by hand. There is no charge to refund in the public product.",
  "legal.refunds.charges.title": "When charges exist",
  "legal.refunds.charges.body":
    "If a paid plan is assigned manually, the operator handles any refund. When a payments provider joins the product, this policy will describe timelines and the channel to request a refund.",
  "legal.refunds.ask.title": "How to ask",
  "legal.refunds.ask.body":
    "Contact the Futrob operator (Davion Software) from the account or the published support channel. Keep the organization identifier and, if there is one, the charge identifier.",
  "common.edit": "Edit",
  "common.pending": "Pending",
  "common.seconds": ({ seconds }) => `${seconds}s`,
  "auth.session.checking": "Checking your access…",
  "auth.session.checkFailed": "Unable to check your access",
  "auth.session.checkFailedDescription": "Check your connection and try again.",
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
  "shell.queue.label": "Pending",
  "shell.nav.loading": "Loading navigation",
  "shell.queue.expand": "Expand to see pending items",
  "shell.queue.empty.title": "Nothing right now",
  "shell.queue.empty.description": "Confirmations, invitations, and disagreements show up here.",
  "shell.queue.loading": "Loading pending items",
  "shell.queue.error": "Pending items could not be loaded",
  "activity.matchDispute.open": "Resolve dispute",
  "activity.matchDispute.closed": "Dispute resolved",
  "activity.selection.pending": "Confirm selection",
  "activity.selection.watching": "Selection awaiting confirmation",
  "activity.selection.expired": "Selection not confirmed in time",
  "activity.selection.closed": "Selection answered",
  "activity.invitation.pending": "Answer invitation",
  "activity.invitation.watching": "Invitation sent",
  "activity.invitation.expired": "Invitation expired",
  "activity.invitation.closed": "Invitation answered",
  "activity.entryInvitation.pending": "Competition invitation",
  "activity.entryInvitation.watching": "Team invited",
  "activity.entryInvitation.expired": "Competition invitation expired",
  "activity.entryInvitation.closed": "Competition invitation answered",
  "activity.competitionPublished": "Competition published",
  "activity.scheduleChange.pending": "Answer reschedule request",
  "activity.scheduleChange.watching": "Reschedule proposed",
  "activity.scheduleChange.decide": "Decide reschedule",
  "activity.scheduleChange.expired": "Reschedule not answered in time",
  "activity.scheduleChange.closed": "Reschedule answered",
  "activity.decision.entryApproved": "Entry approved",
  "activity.decision.entryRejected": "Entry rejected",
  "activity.decision.scheduleSet": "New date set by the organizer",
  "activity.decision.scheduleKept": "The organizer kept the date",
  "activity.decision.walkoverIntended": "The organizer decided a walkover",
  "activity.decision.sanctionImposed": "The organizer imposed a sanction",
  "activity.decision.sanctionRevoked": "The organizer revoked a sanction",
  "pages.competition.sanctions.title": "Sanctions",
  "pages.competition.sanctions.subtitle":
    "Warnings, point deductions, suspensions and administrative defeats in this competition.",
  "sanctions.list.label": "Competition sanctions",
  "sanctions.list.loading": "Loading sanctions",
  "sanctions.list.error": "We couldn't load the sanctions.",
  "sanctions.list.empty.title": "No sanctions",
  "sanctions.list.empty.description":
    "When you sanction a team or a player it shows up here, with the reason and who imposed it.",
  "sanctions.list.notFound.title": "Sanctions unavailable",
  "sanctions.list.notFound.description":
    "This competition isn't part of this organization, or your account can't see its sanctions.",
  "sanctions.team.title": "Sanctions",
  "sanctions.team.label": "Team sanctions",
  "sanctions.team.loading": "Loading the team's sanctions",
  "sanctions.team.error": "We couldn't load the team's sanctions.",
  "sanctions.team.empty": "Your team has no sanctions in this competition.",
  "sanctions.team.forbidden": "You can't see this team's sanctions.",
  "sanctions.type.warning": "Warning",
  "sanctions.type.pointsDeduction": "Point deduction",
  "sanctions.type.matchSuspension": "Suspension",
  "sanctions.type.administrativeDefeat": "Administrative defeat",
  "sanctions.detail.points": ({ count }) => (count === 1 ? "−1 point" : `−${count} points`),
  "sanctions.detail.matches": ({ count }) => (count === 1 ? "1 match" : `${count} matches`),
  "sanctions.detail.encounter": "For a match in this competition",
  "sanctions.target.team": "Team",
  "sanctions.target.player": "Player",
  "sanctions.target.unnamedTeam": "Team name unavailable",
  "sanctions.target.unnamedPlayer": "Player name unavailable",
  "sanctions.column.sanction": "Sanction",
  "sanctions.column.target": "Sanctioned",
  "sanctions.column.reason": "Reason",
  "sanctions.column.imposedAt": "Imposed",
  "sanctions.column.status": "Status",
  "sanctions.column.actions": "Actions",
  "sanctions.status.active": "Active",
  "sanctions.status.revoked": "Revoked",
  "sanctions.reason": "Reason",
  "sanctions.reasonRequired": "Write a reason of at least 3 characters.",
  "sanctions.impose.trigger": "Sanction",
  "sanctions.impose.title": "New sanction",
  "sanctions.impose.description":
    "It's recorded with your name, the reason and the date. It can't be deleted, only revoked.",
  "sanctions.impose.target": "Who",
  "sanctions.impose.type": "Type",
  "sanctions.impose.team": "Team",
  "sanctions.impose.teamPlaceholder": "Choose a team",
  "sanctions.impose.teamsError": "Unable to load the teams.",
  "sanctions.impose.playersError": "Unable to load the team roster.",
  "sanctions.impose.encountersError": "Unable to load the team's matches.",
  "sanctions.impose.noTeams": "No approved teams",
  "sanctions.impose.teamRequired": "Choose the team.",
  "sanctions.impose.player": "Player",
  "sanctions.impose.playerPlaceholder": "Choose a player",
  "sanctions.impose.playerNeedsTeam": "Choose the team first",
  "sanctions.impose.playerRequired": "Choose the player.",
  "sanctions.impose.points": "Points to deduct",
  "sanctions.impose.pointsInvalid": "Enter a whole number from 1 to 100.",
  "sanctions.impose.matches": "Matches suspended",
  "sanctions.impose.matchesInvalid": "Enter a whole number from 1 to 20.",
  "sanctions.impose.encounter": "Match",
  "sanctions.impose.encounterPlaceholder": "Choose the match",
  "sanctions.impose.noEncounters": "This team has no matches",
  "sanctions.impose.encounterRequired": "Choose the match.",
  "sanctions.impose.encounterOption": ({ round, home, away }) =>
    `Round ${round}: ${home} vs ${away}`,
  "sanctions.impose.confirm": "Record sanction",
  "sanctions.revoke.trigger": "Revoke",
  "sanctions.revoke.title": "Revoke sanction",
  "sanctions.revoke.description": ({ type, target }) =>
    `${type} for ${target}. It stays listed as revoked, with your name and the reason.`,
  "sanctions.revoke.confirm": "Revoke sanction",
  "errors.competitions.invalid_sanction": "Check the sanction details.",
  "errors.competitions.sanction_target_not_found":
    "That team, player or match is no longer in this competition.",
  "errors.competitions.sanction_not_found": "That sanction doesn't exist in this competition.",
  "errors.competitions.sanction_already_revoked": "That sanction was already revoked.",
  "errors.competitions.sanctions_closed":
    "Sanctions can't be recorded or revoked in the competition's current state.",
  "errors.competitions.sanction_failed": "We couldn't save the sanction. Try again.",
  "activity.decision.generic": "Organizer decision",
  "activity.competitionEntry.pending": "Review entry",
  "activity.competitionEntry.watching": "Entry pending",
  "activity.competitionEntry.closed": "Team entry",
  "activity.recent.title": "Recent activity",
  "activity.recent.viewAll": "View all activity",
  "activity.recent.empty":
    "No activity yet. Disputes, confirmations, invitations, and publications will show up here.",
  "activity.error": "Activity could not be loaded.",
  "activity.page.title": "Activity",
  "activity.page.description": "Everything that happened in the organization, newest first.",
  "activity.personal.description": "Your invitations and your teams' activity, newest first.",
  "activity.personal.empty":
    "Your invitations and activity for the teams you represent will appear here.",
  "activity.page.loadMore": "Load more",
  "activity.page.loadingMore": "Loading more activity",
  "activity.page.empty.title": "No activity yet",
  "activity.page.empty.description":
    "When a dispute opens, a selection is proposed, an invitation is sent, or a competition is published, it shows up here.",
  "activity.page.forbidden.title": "You can't view this activity",
  "activity.page.forbidden.description":
    "Organization activity is for the people who run its competitions.",
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
  "onboarding.loading.preparing": "Getting your account ready…",
  "onboarding.loading.error": "Unable to restore your progress",
  "onboarding.loading.errorDescription": "Check your connection and try again.",
  "onboarding.intention.title": "What do you want to do first?",
  "onboarding.intention.description":
    "Your choice helps us prepare Futrob for what you want to do first.",
  "onboarding.intention.aria": "Onboarding goal",
  "onboarding.intention.organization.label": "Organize",
  "onboarding.intention.organization.description":
    "Create your organization and set up competitions later.",
  "onboarding.intention.invitation.label": "Join",
  "onboarding.intention.invitation.description":
    "Join a competition with your invitation link or code.",
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
  "onboarding.organization.continue": "Continue",
  "onboarding.organization.createAccount": "Create your account",
  "organizations.create.title": "Create organization",
  "organizations.create.description": "Create another space to manage competitions and teams.",
  "organizations.create.name.label": "Organization name",
  "organizations.create.name.placeholder": "e.g. Night League",
  "organizations.create.name.description":
    "This is your organization's public name. It must be unique.",
  "organizations.create.name.required": "Enter the organization name.",
  "organizations.create.name.max": "The name must be 120 characters or fewer.",
  "organizations.create.name.conflict": "That name is already in use. Choose another one.",
  "organizations.create.name.invalid": "The name isn't valid.",
  "organizations.create.checkFailed": "We couldn't check the name. Try again.",
  "organizations.create.failed": "We couldn't create the organization. Try again.",
  "organizations.create.submit": "Create organization",
  "organizations.create.submitting": "Creating…",
  "organizations.create.logoFailed":
    "We created the organization, but couldn't upload the logo. You can upload it from Settings.",
  "organizations.create.logoRetry": "Retry upload",
  "organizations.create.continue": "Continue without a logo",
  "organizations.profile.slug.label": "Slug",
  "organizations.profile.slug.description":
    "Unique identifier for your organization: lowercase letters, numbers and hyphens.",
  "organizations.profile.slug.invalid":
    "Use 3 to 48 characters: lowercase letters, numbers and hyphens, no reserved words.",
  "organizations.profile.slug.taken": "That slug is already in use.",
  "organizations.profile.slug.checkFailed": "We couldn't check the slug. Try again.",
  "organizations.profile.slug.useSuggestion": ({ slug }) => `Use "${slug}"`,
  "organizations.profile.timeZone.label": "Time zone",
  "organizations.profile.timeZone.placeholder": "Select a time zone",
  "organizations.profile.timeZone.description":
    "The starting zone for new competitions. It doesn't change existing ones.",
  "organizations.profile.logo.label": "Logo",
  "organizations.profile.logo.description":
    "PNG, JPEG or WebP up to 2 MB. Without a logo a monogram is shown.",
  "organizations.profile.logo.upload": "Upload logo",
  "organizations.profile.logo.change": "Change logo",
  "organizations.profile.logo.remove": "Remove logo",
  "organizations.profile.logo.invalidType": "Use a PNG, JPEG or WebP image.",
  "organizations.profile.logo.tooLarge": "The image is larger than 2 MB.",
  "organizations.profile.logo.alt": ({ name }) => `${name} logo`,
  "organizations.settings.title": "Organization settings",
  "organizations.settings.description": "Name, slug, time zone and logo of your organization.",
  "organizations.settings.loading": "Loading profile…",
  "organizations.settings.save": "Save changes",
  "organizations.settings.saving": "Saving…",
  "organizations.settings.saved": "Changes saved.",
  "organizations.settings.readOnly": "Only organizers can change these details.",
  "organizations.settings.loadFailed": "We couldn't load the organization profile.",
  "organizations.settings.saveFailed": "We couldn't save your changes. Try again.",
  "organizations.settings.logoFailed":
    "We saved your changes, but couldn't upload the logo. Try again.",
  "competitions.setup.step": ({ step, total }) => `Step ${step} of ${total}`,
  "competitions.setup.back": "Back",
  "competitions.setup.saveDraft": "Save draft",
  "competitions.setup.saving": "Saving…",
  "competitions.setup.continue": "Continue",
  "errors.organizations.slug_conflict": "That slug is already in use. Choose another one.",
  "errors.organizations.invalid_slug":
    "The slug isn't valid. Use lowercase letters, numbers and hyphens.",
  "errors.organizations.invalid_time_zone": "The time zone isn't valid.",
  "errors.organizations.invalid_logo": "The logo isn't valid.",
  "errors.organizations.creation_key_conflict":
    "We couldn't reuse the previous request. Check the details and try again.",
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
  "onboarding.competition.validation.formatNotInPlan":
    "That format isn't in the Free plan. Choose another one to continue.",
  "onboarding.competition.format.planHint":
    "Your organization starts on the Free plan. Formats marked Pro need another plan.",
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
  "onboarding.account.saveContinue": "Save and continue",
  "onboarding.account.saveReview": "Save and review",
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
    "Optional. It's only used to show your club's recent matches. We don't verify ownership.",
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
  "onboarding.review.finish.organization": "Create organization",
  "onboarding.review.finish.invitation": "Accept invitation",
  "onboarding.review.finish.player": "Enter my personal space",
  "errors.fallback": "We couldn't complete the operation. Try again.",
  "errors.onboarding.organizationCheck": "We couldn't check the name. Try again.",
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
  "invitations.accept.rateLimited": "You've reached the temporary invitation limit.",
  "errors.organizations.name_conflict":
    "That organization name is already in use. Go back and choose another one.",
  "errors.organizations.invalid_name": "The organization name isn't valid.",
  "errors.onboarding.formatNotInPlan":
    "Your organization starts on the Free plan, which doesn't include that format. Go back to Competition and choose another one.",
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
  "shell.identity.empty": "No organization",
  "shell.identity.loading": "Loading your space…",
  "player.home.title": "Home",
  "player.home.subtitle.loading": "Loading your activity…",
  "player.home.clubAssociationFailed.title": "Your club wasn't added",
  "player.home.clubAssociationFailed.description":
    "EA didn't respond when we saved your club. Your profile is ready and you can add the club later.",
  "player.home.clubAssociationFailed.action": "Go to EA Clubs",
  "player.home.clubAssociationFailed.dismiss": "Dismiss notice",
  "player.home.subtitle.activity": ({ club }) => `Your activity with ${club}`,
  "player.home.cta.matches": "View my matches",
  "player.home.cta.refreshMatches": "Refresh matches",
  "player.home.cta.competitions": "View my competitions",
  "player.home.cta.exploreCompetitions": "Browse competitions",
  "player.home.cta.linkEa": "Register identifier",
  "player.home.cta.selectClub": "Select club",
  "player.home.cta.reviewInvitations": "Review invitations",
  "player.home.cta.viewCompetition": "View competition",
  "player.home.cta.viewHistory": "View history",
  "player.home.cta.retry": "Try again",
  "player.home.cta.reviewLink": "Review identifier",
  "player.home.error": "Unable to load",
  "player.home.updating": "Updating…",
  "player.home.updatedAgo": ({ time }) => `Updated ${time}`,
  "player.home.hero.onboarding.title": "Start with your game data",
  "player.home.hero.onboarding.subtitle": "Select your EA Clubs club and register your identifier.",
  "player.home.hero.selectClub.title": "Select a club",
  "player.home.hero.selectClub.subtitle":
    "Choose your club to see activity, matches, and competitions.",
  "player.home.hero.next.title": "Your next fixture",
  "player.home.hero.next.emptyTitle": "No fixtures scheduled",
  "player.home.hero.next.emptySubtitle":
    "Your club is already in competitions. A date for the next fixture is not set yet.",
  "player.home.hero.next.round": ({ competition, matchday }) =>
    `${competition} · Matchday ${matchday}`,
  "player.home.hero.next.vs": "VS",
  "player.home.hero.next.pending": "Not played yet",
  "player.home.hero.jump.title": "Step into competition",
  "player.home.hero.jump.subtitle": "Your team is not in a Futrob tournament yet.",
  "player.home.invitations.pendingTitle": "Pending",
  "player.home.invitations.emptyTitle": "No pending invitations",
  "player.home.invitations.emptySubtitle": "When a club invites you, you can respond here.",
  "player.home.invitations.pendingCount": ({ count }) =>
    count === 1 ? "1 invitation to answer" : `${count} invitations to answer`,
  "player.home.invitations.pendingCaption": "Respond to join\nand play with other clubs.",
  "player.home.ea.linkedTitle": "Game identifier",
  "player.home.ea.linkedCaption": "Registered with EA Clubs.",
  "player.home.ea.linkedHint": "Used to recognize your appearances.",
  "player.home.ea.unlinkedTitle": "No game identifier",
  "player.home.ea.unlinkedSubtitle": "Register your EA identifier to recognize your appearances.",
  "player.home.stats.matches": "Matches",
  "player.home.stats.wins": "Wins",
  "player.home.stats.rating": "Rating",
  "player.home.stats.goalsAssists": "Goals + assists",
  "player.home.stats.empty": "Your statistics will appear when you have recorded matches.",
  "player.home.stats.unavailableTitle": "Personal performance unavailable",
  "player.home.stats.unavailableSubtitle":
    "Register your game identifier to recognize your performance in matches.",
  "player.home.lastMatch.title": "Last match",
  "player.home.lastMatch.viewAll": "View all",
  "player.home.lastMatch.finished": "Finished",
  "player.home.lastMatch.didNotPlay": "You did not play",
  "player.home.lastMatch.emptyTitle": "No matches recorded yet",
  "player.home.lastMatch.emptySubtitle": "You have no appearances in the selected club.",
  "player.home.lastMatch.onboardingTitle": "You have no matches yet",
  "player.home.lastMatch.onboardingSubtitle":
    "When you play your first matches with your club,\nyou will see them here.",
  "player.home.lastMatch.lockedTitle": "We cannot identify your performance in matches yet.",
  "player.home.competitions.title": "My competitions",
  "player.home.competitions.viewAll": "View all",
  "player.home.competitions.emptyTitle": "No competitions yet",
  "player.home.competitions.emptySubtitle": "You will see the tournaments your team joins here.",
  "player.home.competitions.onboardingTitle": "Your team is not in a competition yet",
  "player.home.competitions.onboardingSubtitle": "Browse tournaments and step into competition.",
  "player.home.competitions.status.registration": "Registration open",
  "player.home.competitions.status.published": "In progress",
  "player.home.competitions.status.draft": "Registered",
  "player.home.competitions.status.paused": "Paused",
  "player.home.competitions.status.finished": "Finished",
  "player.home.competitions.status.archived": "Archived",
  "player.home.competitions.format.league": "Official competition",
  "player.home.competitions.format.knockout": "Knockout",
  "player.home.competitions.format.groups-knockout": "Groups and knockout",
  "player.home.competitions.format.league-playoffs": "League and playoffs",
  "player.home.competitions.format.swiss": "Swiss system",
  "player.competitions.title": "My competitions",
  "player.competitions.description": "Competitions you play in with a team.",
  "player.competitions.loading": "Loading competitions…",
  "player.competitions.error":
    "We could not load competitions. Check your connection and try again.",
  "player.competitions.empty.title": "Your club is not in any competitions yet",
  "player.competitions.empty.subtitle":
    "Browse available tournaments and share the ones you care about with your club captain.",
  "player.competitions.empty.otherClub": "Looking for another club?",
  "player.competitions.explore.title": "Explore competitions",
  "player.competitions.explore.description":
    "Discover tournaments to follow and share with your club.",
  "player.competitions.explore.breadcrumb.competitions": "Competitions",
  "player.competitions.explore.breadcrumb.explore": "Explore",
  "player.competitions.explore.search.label": "Search by name",
  "player.competitions.explore.search.placeholder": "Competition name",
  "player.competitions.explore.status.label": "Status",
  "player.competitions.explore.status.all": "All statuses",
  "player.competitions.explore.status.registration": "Registration open",
  "player.competitions.explore.status.published": "In progress",
  "player.competitions.explore.status.paused": "Paused",
  "player.competitions.explore.status.finished": "Finished",
  "player.competitions.explore.format.label": "Format",
  "player.competitions.explore.format.all": "All formats",
  "player.competitions.explore.region.label": "Region",
  "player.competitions.explore.region.all": "All regions",
  "player.competitions.explore.platform.label": "Platform",
  "player.competitions.explore.platform.all": "All platforms",
  "player.competitions.explore.sort.label": "Sort",
  "player.competitions.explore.sort.updated-desc": "Most recent",
  "player.competitions.explore.sort.name-asc": "Name A-Z",
  "player.competitions.explore.count": ({ count }) =>
    count === 1 ? "1 competition" : `${count} competitions`,
  "player.competitions.explore.loading": "Loading competitions…",
  "player.competitions.explore.error":
    "We could not load competitions. Check your connection and try again.",
  "player.competitions.explore.retry": "Try again",
  "player.competitions.explore.empty.filtered.title": "We could not find competitions",
  "player.competitions.explore.empty.filtered.subtitle":
    "Try a different name or widen the search filters",
  "player.competitions.explore.empty.filtered.cta": "Clear search and filters",
  "player.competitions.explore.empty.none.title": "There are no published competitions yet",
  "player.competitions.explore.empty.none.subtitle":
    "When an organizer publishes a tournament, it will appear here so you can view and share it.",
  "player.competitions.explore.card.view": "View competition",
  "player.competitions.explore.card.share": "Share competition",
  "player.competitions.explore.card.shareCopied": "Link copied",
  "player.competitions.explore.card.manage": "Manage",
  "player.competitions.explore.card.participating": "Your team is in",
  "player.competitions.explore.card.organizer": ({ name }) => `Organized by ${name}`,
  "player.competitions.explore.card.startsOn": ({ date }) => `Start: ${date}`,
  "player.competitions.explore.card.endsOn": ({ date }) => `End: ${date}`,
  "player.competitions.explore.card.teamsOf": ({ count, max }) => `${count} of ${max} teams`,
  "player.competitions.explore.card.teamsFull": ({ count }) => `Full (${count} teams)`,
  "player.competitions.explore.card.teams": ({ count }) =>
    count === 1 ? "1 team" : `${count} teams`,
  "player.competitions.explore.more": "Show more",
  "player.competitions.detail.loading": "Loading competition…",
  "player.competitions.detail.error":
    "We could not load this competition. Check your connection and try again.",
  "player.competitions.detail.notFound.title": "Competition unavailable",
  "player.competitions.detail.notFound.subtitle":
    "This competition is not published or can no longer be viewed.",
  "player.competitions.detail.notFound.cta": "Back to explore",
  "player.competitions.detail.meta.format": "Format",
  "player.competitions.detail.meta.region": "Region",
  "player.competitions.detail.meta.platform": "Platform",
  "player.competitions.detail.meta.edition": "Edition",
  "player.competitions.detail.meta.timeZone": "Time zone",
  "player.competitions.detail.meta.organizer": "Organizer",
  "player.competitions.detail.meta.teams": "Registered teams",
  "player.competitions.detail.meta.startsOn": "Dates",
  "player.competitions.detail.share": "Share",
  "player.competitions.detail.shareCopied": "Link copied",
  "player.competitions.detail.manage": "Manage",
  "player.competitions.apply.title": "Register your team",
  "player.competitions.apply.description":
    "Create your team for this competition. You'll be its captain, and the organizer will review the request.",
  "player.competitions.apply.teamName": "Team name",
  "player.competitions.apply.submit": "Send request",
  "player.competitions.apply.submitting": "Sending…",
  "player.competitions.apply.error": "The request couldn't be sent. Try again.",
  "player.competitions.apply.error.closed": "Registration for this competition has closed.",
  "player.competitions.apply.error.conflict": "You're already on a team in this competition.",
  "player.competitions.apply.status.pending.title": "Request sent",
  "player.competitions.apply.status.pending.description": ({ team }) =>
    `${team} is waiting for the organizer's review.`,
  "player.competitions.apply.status.approved.title": "Team registered",
  "player.competitions.apply.status.approved.description": ({ team }) =>
    `${team} is taking part in this competition.`,
  "player.competitions.apply.status.approved.cta": "Go to competition",
  "player.competitions.apply.status.rejected.title": "Request declined",
  "player.competitions.apply.status.rejected.description": ({ team }) =>
    `The organizer didn't approve ${team}.`,
  "player.invitations.title": "Invitations",
  "player.invitations.competitions.title": "Competition invitations",
  "player.invitations.competitions.description":
    "When you accept, you name your team and become its captain.",
  "player.invitations.competitions.open": "View invitation",
  "player.invitations.description":
    "Review the invitations you have received and choose where to take part.",
  "player.invitations.redeem": "Redeem an invitation code",
  "player.invitations.error": "We could not load invitations. Check your connection and try again.",
  "player.invitations.tab.history": "History",
  "player.invitations.empty.title": "You have no pending invitations",
  "player.invitations.empty.subtitle":
    "When a captain invites you to their team, you can review the invitation and respond here.",
  "player.invitations.empty.footer":
    "Expecting an invitation? Confirm with the captain that they sent it to your account.",
  "player.invitations.history.empty.title": "No previous invitations",
  "player.invitations.history.empty.subtitle":
    "When you respond to an invitation, it will be recorded here with its outcome.",
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
  "player.matchDetail.yourMatch": "Your match",
  "player.matchDetail.you": "You",
  "player.matchDetail.roster": "Roster",
  "player.matchDetail.rosters": "Match rosters",
  "player.matchDetail.rosters.registered": ({ count }) =>
    count === 1 ? "1 registered player" : `${count} registered players`,
  "player.matchDetail.rosters.playerCount": ({ count }) =>
    count === 1 ? "1 player" : `${count} players`,
  "player.matchDetail.rosters.winner": "Winner",
  "player.matchDetail.rosters.badge.playmaker": "Playmaker",
  "player.matchDetail.rosters.badge.assister": "Assister",
  "player.matchDetail.rosters.badge.defender": "Defender",
  "player.matchDetail.rosters.column.player": "Player",
  "player.matchDetail.rosters.column.position": "Pos.",
  "player.matchDetail.rosters.column.rating": "Rating",
  "player.matchDetail.rosters.column.goals": "G",
  "player.matchDetail.rosters.column.assists": "A",
  "player.matchDetail.rosters.column.shots": "Shots",
  "player.matchDetail.rosters.column.passes": "Passes",
  "player.matchDetail.rosters.column.tackles": "Tackles",
  "player.matchDetail.roster.empty": "No player data is available for this roster.",
  "player.matchDetail.tab.summary": "Summary",
  "player.matchDetail.tab.players": "Players",
  "player.matchDetail.tab.facts": "Match details",
  "player.matchDetail.comparison": "Team comparison",
  "player.matchDetail.performance": "Your performance",
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
  "player.matchDetail.position.short.goalkeeper": "GK",
  "player.matchDetail.position.short.defender": "DF",
  "player.matchDetail.position.short.midfielder": "CM",
  "player.matchDetail.position.short.forward": "ST",
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
  "player.statistics.title": "My statistics",
  "player.statistics.description":
    "You as a player: rating, attributes and statistics from your recent matches.",
  "player.statistics.loading": "Loading your statistics…",
  "player.statistics.error": "We could not load your statistics.",
  "player.competitionStats.emptyTitle": "No official statistics yet",
  "player.competitionStats.emptyDescription":
    "Your statistics will appear here when official results are approved in this competition.",
  "player.competitionStats.refreshFailed":
    "We could not refresh your statistics. The last ones we loaded are still shown.",
  "player.statistics.emptyTitle": "No appearances of yours yet",
  "player.statistics.emptyDescription":
    "We can only see the last 50 matches EA has available. If there are no appearances in the range, try other dates.",
  "player.statistics.period.label": "Date range",
  "player.statistics.period.from": "From",
  "player.statistics.period.to": "To",
  "player.statistics.period.apply": "Apply",
  "player.statistics.period.invalid": "Choose a start date on or before the end date.",
  "player.statistics.period.summary": ({ from, to }) => `${from} – ${to}`,
  "player.statistics.needsClub.title": "Associate a club to recognise your matches",
  "player.statistics.needsClub.description":
    "Your profile is built from your appearances. An associated club lets us find them.",
  "player.statistics.needsGameAccount.title": "Register your game identifier",
  "player.statistics.needsGameAccount.description":
    "Without a game account we cannot recognise you in matches.",
  "player.statistics.open": "Open your profile",
  "player.statistics.matchesCount": ({ count }) =>
    count === 1 ? "1 match played" : `${count} matches played`,
  "player.statistics.record": "W–D–L",
  "player.statistics.record.hint": ({ percent }) => `${percent} wins`,
  "player.statistics.assists.hint": ({ average }) => `${average} per match`,
  "player.statistics.rating.hint": "Average per match",
  "player.statistics.goals.hint": ({ average }) => `${average} per match`,
  "player.statistics.summary": "Summary",
  "player.statistics.identity": "Player",
  "player.statistics.attributes": "Attributes",
  "player.statistics.attributes.description": "Choose a category to see the breakdown.",
  "player.statistics.attributes.select": "Attribute categories",
  "player.statistics.strength": "Strength",
  "player.statistics.toImprove": "To improve",
  "player.statistics.evolution": "Rating by match",
  "player.statistics.evolution.description": "How it has changed from match to match.",
  "player.statistics.evolution.empty": "No matches yet to plot your rating.",
  "player.statistics.evolution.ratingUnavailable": "These matches do not include a rating.",
  "player.statistics.evolution.listLabel": "Rating by match",
  "player.statistics.evolution.rating": "Rating",
  "player.statistics.form": "Record",
  "player.statistics.form.description": "Wins, draws and losses.",
  "player.statistics.form.empty": "No matches yet to build your record.",
  "player.statistics.form.winShare": ({ percent }) => `${percent} wins`,
  "player.statistics.form.winShare.percent": ({ percent }) => String(percent),
  "player.statistics.form.winShare.label": "Wins",
  "player.statistics.form.lastFive": "Last 5 matches",
  "player.statistics.form.wins": ({ count }) => (count === 1 ? "1 win" : `${count} wins`),
  "player.statistics.form.draws": ({ count }) => (count === 1 ? "1 draw" : `${count} draws`),
  "player.statistics.form.losses": ({ count }) => (count === 1 ? "1 loss" : `${count} losses`),
  "player.statistics.form.unknowns": ({ count }) =>
    count === 1 ? "1 without a result" : `${count} without a result`,
  "player.statistics.form.listLabel": "Result split",
  "player.statistics.outcome.short.win": "W",
  "player.statistics.outcome.short.draw": "D",
  "player.statistics.outcome.short.loss": "L",
  "player.statistics.outcome.short.unknown": "?",
  "player.statistics.attribute.attack": "Attack",
  "player.statistics.attribute.pass": "Passing",
  "player.statistics.attribute.defense": "Defense",
  "player.statistics.attribute.impact": "Impact",
  "player.statistics.attribute.discipline": "Discipline",
  "player.statistics.component.goalsPerMatch": "Goals per match",
  "player.statistics.component.shotsPerMatch": "Shots per match",
  "player.statistics.component.shotAccuracy": "Shot conversion",
  "player.statistics.component.offensiveRoleRating": "Offensive rating",
  "player.statistics.component.passSuccess": "Pass success",
  "player.statistics.component.passVolume": "Passes",
  "player.statistics.component.tacklesMadePerMatch": "Successful tackles per match",
  "player.statistics.component.tackleSuccess": "Tackle success",
  "player.statistics.component.defensiveRoleRating": "Defensive rating",
  "player.statistics.component.averageRating": "Average rating",
  "player.statistics.component.winRate": "Win rate",
  "player.statistics.component.goalsAssistsPerMatch": "G+A per match",
  "player.statistics.component.fewerRedsPerMatch": "Reds per match",
  "player.statistics.component.points": ({ points }) =>
    points === 1 ? "1 point" : `${points} points`,
  "player.statistics.component.confidence": ({ percent }) => `${percent}% confidence`,
  "player.statistics.component.weightedMatches": ({ count }) =>
    count === 1 ? "1 weighted match" : `${count} weighted matches`,
  "player.gameData.review": "Review game data",
  "player.gameData.refresh": "Update data",
  "player.gameData.refreshing": "Updating…",
  "player.gameData.loading": "Loading game data…",
  "player.gameData.error": "Unable to load your game data.",
  "player.gameData.subtitle.empty": "Register your identifier to look up your EA Clubs activity.",
  "player.gameData.subtitle.ready":
    "Manage your EA identifier and the clubs you use to look up your matches.",
  "player.gameData.setup.title": "Register your game data",
  "player.gameData.setup.subtitle":
    "Select your platform, search for your EA Clubs club, and register your identifier.",
  "player.gameData.setup.cta": "Register your identifier",
  "player.gameData.setup.hint": "Matches and statistics appear after you register your identifier.",
  "player.gameData.setup.steps.progress": "Registration steps",
  "player.gameData.setup.steps.platform": "Platform",
  "player.gameData.setup.steps.club": "Club",
  "player.gameData.setup.steps.identifier": "Identifier",
  "player.gameData.setup.steps.summary": ({ current, label, total }) =>
    `Step ${current} of ${total} · ${label}`,
  "player.gameData.setup.saveFailed": "We could not finish registering your game data. Try again.",
  "player.gameData.identifier.title": "Player identifier",
  "player.gameData.identifier.empty": "You have not registered an EA identifier yet.",
  "player.gameData.identifier.edit": "Edit identifier",
  "player.gameData.identifier.editTitle": "Edit identifier",
  "player.gameData.identifier.editDescription":
    "Update your identifier, platform and edition. Associated clubs stay the same.",
  "player.gameData.identifier.save": "Save changes",
  "player.gameData.identifier.saveFailed": "The changes could not be saved. Try again.",
  "player.gameData.identifier.conflict":
    "You already have an account with that identifier, platform and edition.",
  "player.gameData.identifier.missing": "That account is no longer available. Refresh the page.",
  "player.gameData.platform": "Platform",
  "player.gameData.clubs.title": "Added clubs",
  "player.gameData.clubs.subtitle": "Choose the club you use to look up your matches.",
  "player.gameData.clubs.empty": "You have not added a club yet.",
  "player.gameData.clubs.selected": "Selected",
  "player.gameData.clubs.change": "Change club",
  "player.gameData.clubs.associate": "Add another club",
  "player.gameData.clubs.meta": "EA club · ID {id}",
  "player.gameData.matches.subtitle": "Your recent matches and the selected club's history.",
  "player.gameData.matches.cta": "View my matches",
  "player.gameData.statistics.subtitle":
    "Your rating, attributes and recent EA Clubs match performance.",
  "player.gameData.statistics.cta": "View my statistics",
  "player.gameData.invitations.title": "My invitations",
  "player.gameData.invitations.subtitle":
    "Club and competition invitations waiting for your reply.",
  "player.gameData.invitations.cta": "View my invitations",
  "pages.organization.teams.title": "Teams",
  "pages.organization.teams.subtitle":
    "Browse your organization's teams and the competitions they take part in.",
  "org.teams.directory.title": "Team directory",
  "org.teams.count": ({ count }) => (Number(count) === 1 ? "1 team" : `${count} teams`),
  "org.teams.countFiltered": ({ shown, total }) => `${shown} of ${total} teams`,
  "org.teams.search": "Search teams by name",
  "org.teams.table.team": "Team",
  "org.teams.table.competitions": "Competitions",
  "org.teams.created": "Created {date}",
  "org.teams.entry.approved": "Approved",
  "org.teams.entry.pending": "Pending",
  "org.teams.entry.rejected": "Rejected",
  "org.teams.link": "{competition}: view {team}",
  "org.teams.noCompetitions": "No competitions",
  "org.teams.competitionsUnavailable": "Unavailable",
  "org.teams.loading": "Loading teams…",
  "org.teams.error": "We couldn't load the organization's teams.",
  "org.teams.refreshFailed": "We couldn't refresh the teams. Showing the previous data.",
  "org.teams.partial":
    "We couldn't load the competitions for every team. Some rows may be incomplete.",
  "org.teams.partialForbidden":
    "You don't have access to the competitions of some teams, so those rows are unavailable.",
  "org.teams.forbidden.title": "You don't have access to teams",
  "org.teams.forbidden.description":
    "Your role in this organization doesn't include viewing its team directory.",
  "org.teams.forbidden.cta": "Back to organization home",
  "org.teams.empty.title": "No teams yet",
  "org.teams.empty.description":
    "Teams appear here once they register in one of your organization's competitions.",
  "org.teams.empty.cta": "View competitions",
  "org.teams.noMatches.title": "No teams match",
  "org.teams.noMatches.description": "We found no teams matching “{query}”. Try another name.",
  "org.teams.noMatches.clear": "Clear search",
  "pages.organization.players.title": "Players",
  "pages.organization.players.subtitle": "Who plays on each roster in your organization.",
  "pages.organization.invitations.title": "Invitations",
  "pages.organization.invitations.subtitle":
    "Invitations sent to your organization's staff and members, with their status.",
  "pages.organization.members.title": "Members and roles",
  "pages.organization.members.subtitle": "Manage members and their authorized access",
  "organizations.members.invite": "Invite member",
  "organizations.members.inviteDescription":
    "Choose their role and generate a link to join your organization.",
  "organizations.members.role": "Organization role",
  "organizations.members.memberHint":
    "Basic organization access. Does not grant access to all its competitions.",
  "organizations.members.staffHint":
    "Can operate competitions and manage organization invitations.",
  "organizations.members.createLink": "Generate link",
  "organizations.members.creating": "Generating link…",
  "organizations.members.inviteFailed": "We couldn't create the invitation. Please try again.",
  "organizations.members.inviteCreated": "Invitation created",
  "organizations.members.inviteLink": "Invitation link",
  "organizations.members.inviteLinkHint":
    "Share this link with the person you want to invite. It can only be used once.",
  "organizations.members.copy": "Copy link",
  "organizations.members.copied": "Link copied",
  "organizations.members.done": "Done",
  "organizations.members.list.title": "Members",
  "organizations.members.list.description": "View organization members and their access.",
  "organizations.members.list.loading": "Loading members…",
  "organizations.members.list.error": "Unable to load the member list.",
  "organizations.members.list.denied":
    "You don't have permission to view this organization's members.",
  "organizations.members.list.unavailableTitle": "Member list unavailable",
  "organizations.members.list.unavailable":
    "Organization members, their roles and their access will appear here.",
  "organizations.members.list.emptyTitle": "No members to show",
  "organizations.members.list.empty": "Members will appear here after they accept an invitation.",
  "organizations.members.list.noMatches": "No matching members",
  "organizations.members.list.noMatchesHint":
    "Try another role or clear the filters to see all members.",
  "organizations.members.list.noMatchesFor":
    "No members match “{query}”. Change your search or clear the filters.",
  "organizations.members.search": "Search members",
  "organizations.members.roleFilter": "Role",
  "organizations.members.allRoles": "All roles",
  "organizations.members.member": "Member",
  "organizations.members.competitionAccess": "Competition access",
  "organizations.members.unknownName": "Unnamed member",
  "organizations.members.accessDenied": "Read access denied",
  "organizations.members.authorizedAccess": "Authorized access",
  "organizations.members.restrictedAccess": "Inherited access with restrictions",
  "organizations.members.noVisibleCompetitions": "No visible competitions to display",
  "organizations.members.allCompetitions": "All competitions",
  "organizations.members.noCompetitions": "No assigned access",
  "organizations.members.actions": "Actions",
  "organizations.members.actionsFor": "Actions for {name}",
  "organizations.members.viewDetails": "View details",
  "organizations.members.clearFilters": "Clear filters",
  "organizations.members.organizerHint":
    "Full control of the organization: members, roles, permissions and competitions.",
  "organizations.members.roleEditor.label": "Change role",
  "organizations.members.roleEditor.save": "Save role",
  "organizations.members.roleEditor.saving": "Saving role…",
  "organizations.members.roleEditor.saved": "Role updated",
  "organizations.members.roleEditor.lastOrganizer":
    "The organization needs at least one organizer. Assign another before changing this role.",
  "organizations.members.roleEditor.forbidden":
    "You don't have the authority to assign or remove this role.",
  "organizations.members.roleEditor.failed": "We couldn't change the role. Please try again.",
  "organizations.members.grants.title": "Specific permissions",
  "organizations.members.grants.loading": "Loading specific permissions…",
  "organizations.members.grants.empty":
    "No specific permissions: their access depends only on their role.",
  "organizations.members.grants.failed": "We couldn't load the specific permissions.",
  "organizations.members.grants.retry": "Retry",
  "organizations.members.grants.allow": "Allowed",
  "organizations.members.grants.deny": "Denied",
  "organizations.members.detail.title": "Member details",
  "organizations.members.detail.description": "Member information and scope of access.",
  "organizations.members.detail.emptyTitle": "Select a member",
  "organizations.members.detail.empty": "Select a row from the list to view their role and access.",
  "organizations.members.emailUnavailable": "Email unavailable",
  "organizations.members.joinedAt": "Member since",
  "organizations.members.dateUnavailable": "Date unavailable",
  "organizations.members.changes.title": "Recent changes",
  "organizations.members.changes.description": "Latest changes to members, roles and access.",
  "organizations.members.changes.change": "Change",
  "organizations.members.changes.performedBy": "Performed by",
  "organizations.members.changes.date": "Date",
  "organizations.members.changes.loading": "Loading recent changes…",
  "organizations.members.changes.error": "Unable to load recent changes.",
  "organizations.members.changes.denied":
    "You don't have permission to view this organization's change history.",
  "organizations.members.changes.unavailableTitle": "Change history unavailable",
  "organizations.members.changes.unavailable":
    "Changes to members, roles and access will appear here.",
  "organizations.members.changes.emptyTitle": "No recent changes",
  "organizations.members.changes.empty":
    "Changes to members, roles and access will be recorded here.",
  "organizations.members.deniedTitle": "Access restricted",
  "organizations.members.refreshing": "Updating…",
  "organizations.members.refreshFailed":
    "Unable to update this section. The latest available data is shown.",
  "organizations.members.copyFailed":
    "We couldn't copy the link. You can select it and copy it manually.",
  "pages.organization.settings.title": "Settings",
  "pages.organization.settings.subtitle": "Your organization's name and preferences.",
  "org.home.description": "Overview of your organization",
  "org.home.createCompetition": "Create competition",
  "org.home.summary": "Summary",
  "org.home.kpi.active": "Active competitions",
  "org.home.kpi.teams": "Teams",
  "org.home.kpi.drafts": "Drafts",
  "org.home.empty.title": "Your organization starts here",
  "org.home.empty.description": "Create your first competition to organize teams and encounters.",
  "org.home.competitions": "Competitions",
  "org.home.competitions.viewAll": "View all",
  "org.home.table.name": "Name",
  "org.home.table.status": "Status",
  "org.home.table.teams": "Teams",
  "org.home.table.start": "Start",
  "org.home.table.actions": "Actions",
  "org.home.table.noStart": "No date",
  "org.home.actions.menu": ({ name }) => `Actions for ${name}`,
  "org.home.actions.open": "Open",
  "org.home.actions.configure": "Set up",
  "org.home.actions.teams": "View teams",
  "org.home.activity": "Recent activity",
  "org.home.activity.empty": "No recent activity yet.",
  "org.home.activity.team": ({ time }) => `Registered team · ${time}`,
  "org.home.activity.competition": ({ status, time }) => `${status} · ${time}`,
  "org.home.status.draft": "Draft",
  "org.home.status.registration": "Registration open",
  "org.home.status.published": "Published",
  "org.home.status.paused": "Paused",
  "org.home.status.finished": "Finished",
  "org.home.status.archived": "Archived",
  "org.home.error.competitions":
    "Unable to load competitions. Check your connection and try again.",
  "org.home.error.profile": "Unable to load the organization name.",
  "pages.competition.fixture.title": "Schedule",
  "pages.competition.fixture.subtitle": "Rounds and dates for each encounter.",
  "pages.competition.encounters.title": "Encounters",
  "pages.competition.encounters.subtitle": "Status and result of each meeting between two teams.",
  "pages.competition.standings.title": "Standings",
  "pages.competition.standings.subtitle": "Official table, built only from approved results.",
  "pages.competition.bracket.title": "Bracket",
  "pages.competition.bracket.subtitle": "Knockout draw, from the first round to the final.",
  "pages.competition.rankings.title": "Rankings",
  "pages.competition.rankings.subtitle":
    "Top players by statistics from approved official matches.",
  "competition.rankings.kinds": "Ranking type",
  "competition.rankings.kind.scorer": "Top scorers",
  "competition.rankings.kind.assister": "Assists",
  "competition.rankings.kind.rating": "Rating",
  "competition.rankings.kind.mvp": "MVP",
  "competition.rankings.kind.goalkeeper": "Goalkeepers",
  "competition.rankings.table.scorer": "Top scorers ranking",
  "competition.rankings.table.assister": "Assists ranking",
  "competition.rankings.table.rating": "Average rating ranking",
  "competition.rankings.table.mvp": "MVP awards ranking",
  "competition.rankings.table.goalkeeper": "Goalkeepers ranking",
  "competition.rankings.metric.scorer": "Goals",
  "competition.rankings.metric.assister": "Assists",
  "competition.rankings.metric.rating": "Avg. rating",
  "competition.rankings.metric.mvp": "MVP awards",
  "competition.rankings.metric.goalkeeper": "Saves",
  "competition.rankings.criterion.scorer": "Most goals in approved official matches.",
  "competition.rankings.criterion.assister": "Most assists in approved official matches.",
  "competition.rankings.criterion.rating": "Best average EA rating in approved official matches.",
  "competition.rankings.criterion.mvp": "Most MVP awards in approved official matches.",
  "competition.rankings.criterion.goalkeeper":
    "Most saves playing in goal; ties go to fewer goals conceded.",
  "competition.rankings.meta.criterion": "Criterion",
  "competition.rankings.meta.eligibility": "Eligibility",
  "competition.rankings.meta.updated": "Updated",
  "competition.rankings.eligibility": ({ matches, percent }) =>
    `At least ${matches} ${Number(matches) === 1 ? "match" : "matches"} or ${percent} of their team's minutes.`,
  "competition.rankings.column.position": "Pos.",
  "competition.rankings.column.positionTitle": "Position",
  "competition.rankings.column.player": "Player",
  "competition.rankings.column.matches": "MP",
  "competition.rankings.column.matchesTitle": "Matches played",
  "competition.rankings.column.minutes": "Min",
  "competition.rankings.column.minutesTitle": "Minutes played",
  "competition.rankings.player.unnamed": "Player name not visible",
  "competition.rankings.team.none": "No team",
  "competition.rankings.team.unnamed": "Team name not visible",
  "competition.rankings.names.loading": "Loading name",
  "competition.rankings.names.error": "We couldn't load player and team names.",
  "competition.rankings.names.restricted":
    "Your access doesn't include rosters, so player and team names aren't shown.",
  "competition.rankings.names.partiallyRestricted":
    "Your access doesn't include some rosters, so those teams and their players aren't named.",
  "competition.rankings.loading": "Loading rankings…",
  "competition.rankings.error": "We couldn't load the rankings.",
  "competition.rankings.refreshError":
    "We couldn't refresh the rankings. Showing the last loaded data.",
  "competition.rankings.notComputed.title": "No rankings yet",
  "competition.rankings.notComputed.description":
    "They're built from the competition's approved official results.",
  "competition.rankings.empty.title": "Nobody qualifies for this ranking yet",
  "competition.rankings.empty.description":
    "Players appear once they meet eligibility and record this metric.",
  "competition.rankings.forbidden.title": "You don't have access to rankings",
  "competition.rankings.forbidden.description":
    "Your role in this competition doesn't include player statistics.",
  "competition.rankings.forbidden.back": "Back to the competition",
  "competition.rankings.notFound.title": "Competition unavailable",
  "competition.rankings.notFound.description":
    "We couldn't find this competition, or you no longer have access.",
  "pages.competition.disputes.title": "Disputes",
  "pages.competition.disputes.subtitle":
    "Selections in dispute or organizer review that are waiting on your decision.",
  "pages.competition.analytics.title": "Analytics",
  "pages.competition.analytics.subtitle": "Participation and activity in the competition.",
  "pages.competition.teamPerformance.title": "Team performance",
  "pages.competition.teamPerformance.subtitle":
    "A 0–100 score built only from approved official results. It does not replace the standings.",
  "teamPerformance.loading": "Loading the performance ranking",
  "teamPerformance.error": "We couldn't load the performance ranking.",
  "teamPerformance.refreshError": "We couldn't refresh the ranking. Showing the last data loaded.",
  "teamPerformance.accessError": "We couldn't check your access to statistics.",
  "teamPerformance.forbidden.title": "You don't have access to this ranking",
  "teamPerformance.forbidden.description":
    "Your role doesn't allow reading statistics for this competition.",
  "teamPerformance.backToCompetition": "Back to the competition",
  "teamPerformance.notBuilt.title": "No performance ranking yet",
  "teamPerformance.notBuilt.description":
    "It is built when official results are approved. Unapproved EA matches don't count.",
  "teamPerformance.notBuilt.action": "View encounters",
  "teamPerformance.empty.title": "No teams in the ranking",
  "teamPerformance.empty.description":
    "Teams approved for the competition and teams with official results will appear here.",
  "teamPerformance.projectionIncomplete.title": "Ranking awaiting rebuild",
  "teamPerformance.projectionIncomplete.description":
    "Some official results are not fully projected yet. No team gets a score until the ranking is rebuilt.",
  "teamPerformance.unmatched": ({ count }) =>
    count === 1
      ? "1 statistics contribution doesn't match the current official result and doesn't count."
      : `${count} statistics contributions don't match the current official result and don't count.`,
  "teamPerformance.criteria.title": "Criteria",
  "teamPerformance.criteria.description":
    "The score is the weighted sum of five 0–100 components. If any is missing, the team has no score: it isn't filled with zero and weights aren't redistributed.",
  "teamPerformance.criteria.window": "Window",
  "teamPerformance.criteria.windowValue": ({ recent }) =>
    `Whole competition · form over the last ${recent} encounters`,
  "teamPerformance.criteria.eligibility": "Eligibility",
  "teamPerformance.criteria.eligibilityValue": ({ minimum }) =>
    `At least ${minimum} official encounters and all five components available`,
  "teamPerformance.criteria.period": "Period",
  "teamPerformance.criteria.noPeriod": "No official results",
  "teamPerformance.criteria.updated": "Updated",
  "teamPerformance.criteria.sources": "Official results",
  "teamPerformance.criteria.sourcesValue": ({ approved, voided }) =>
    voided === 0 ? `${approved} approved` : `${approved} approved · ${voided} voided (don't count)`,
  "teamPerformance.criteria.versions": ({ formula, normalization, window }) =>
    `Versions: ${formula} · ${normalization} · ${window}`,
  "teamPerformance.weights.label": "Formula weights",
  "teamPerformance.weight": ({ weight }) => `${weight}%`,
  "teamPerformance.table.title": "Ranking",
  "teamPerformance.table.summary": ({ scored, incomplete }) =>
    `${scored} scored · ${incomplete} without a score`,
  "teamPerformance.table.position": "Pos.",
  "teamPerformance.table.team": "Team",
  "teamPerformance.table.score": "Score",
  "teamPerformance.table.encounters": "Encounters",
  "teamPerformance.table.coverage": "Coverage",
  "teamPerformance.table.noValue": "No data",
  "teamPerformance.table.unranked": "No score",
  "teamPerformance.table.scrollHint": "Scroll the table to see every component.",
  "teamPerformance.team.unknown": "Team unavailable",
  "teamPerformance.teamsUnavailable": "We couldn't load team names. The ranking is still valid.",
  "teamPerformance.metric.results": "Results",
  "teamPerformance.metric.goalDifference": "Goal difference",
  "teamPerformance.metric.recentForm": "Recent form",
  "teamPerformance.metric.offensiveEfficiency": "Attacking efficiency",
  "teamPerformance.metric.defensiveEfficiency": "Defensive efficiency",
  "teamPerformance.reason.complete": "Complete",
  "teamPerformance.reason.no_data": "No official matches",
  "teamPerformance.reason.insufficient_sample": ({ count, minimum }) =>
    `Sample too small: ${count} of ${minimum} encounters`,
  "teamPerformance.reason.missing_components": "Missing components",
  "teamPerformance.reason.projection_incomplete": "Projection incomplete",
  "teamPerformance.missing": ({ metrics }) => `Missing: ${metrics}`,
  "teamPerformance.standingsLink": "View official standings",
  "pages.competition.rules.title": "Rules",
  "pages.competition.rules.subtitle": "Format, tiebreakers, and rescheduling rules in effect.",
  "pages.competitionPlayer.matches.title": "Matches",
  "pages.competitionPlayer.matches.subtitle":
    "Your matches in this competition: upcoming and played.",
  "pages.competitionPlayer.stats.title": "Statistics",
  "pages.competitionPlayer.stats.subtitle": "Your official statistics in this competition.",
  "pages.competitionPlayer.team.title": "My team",
  "pages.competitionPlayer.team.subtitle":
    "View the roster and club of your team in this competition.",
  "pages.captain.roster.title": "Roster",
  "pages.captain.roster.subtitle":
    "See who is on your team, assign roles, and decide whether it accepts new players.",
  "pages.captain.invitations.title": "Team invitations",
  "pages.captain.invitations.subtitle": "Create links so other players can join your roster.",
  "captain.loading": "Loading your team…",
  "captain.noTeam.title": "You have no team in this competition",
  "captain.noTeam.description": "Once you join a roster, you can manage your team here.",
  "captain.noTeam.action": "Review my invitations",
  "captain.forbidden.title": "You don't have access to this page",
  "captain.forbidden.roster": "Only the captain and vice-captain can manage the roster.",
  "captain.forbidden.team": "You cannot view the roster of this team.",
  "captain.forbidden.invitations": "Only the captain and vice-captain can invite players.",
  "captain.forbidden.action": "Go to My team",
  "captain.unavailable.title": "Unable to check your access",
  "captain.unavailable.description": "Check your connection and try again.",
  "captain.stats.spots": "Spots",
  "captain.stats.spotsFull": "Roster full",
  "captain.stats.spotsLeft": (params) =>
    count(params) === 1 ? "1 spot left" : `${count(params)} spots left`,
  "captain.stats.state": "Status",
  "captain.stats.open": "Open",
  "captain.stats.closed": "Closed",
  "captain.stats.openHint": "Accepts players by invitation",
  "captain.stats.closedHint": "Not accepting new players",
  "captain.stats.club": "EA club",
  "captain.stats.noClub": "No EA club",
  "captain.stats.noClubHint": "Needed to look up matches",
  "captain.roster.players": "Players",
  "captain.roster.column.player": "Player",
  "captain.roster.column.role": "Role",
  "captain.roster.open": "Open roster",
  "captain.roster.openDescription":
    "The roster will accept players by invitation again while it has spots.",
  "captain.roster.close": "Close roster",
  "captain.roster.closeDescription":
    "Invitation links will stop accepting players while the roster is closed.",
  "captain.roster.invite": "Invite player",
  "captain.roster.alone.title": "You're the only one on the roster",
  "captain.roster.alone.description": "Use Invite player to complete your team.",
  "captain.invitations.closed.title": "The roster is closed",
  "captain.invitations.closed.description": "Links won't accept players until you open the roster.",
  "captain.invitations.closed.action": "Go to roster",
  "captain.invitations.full.title": "The roster is full",
  "captain.invitations.full.description": "Links won't accept players until a spot opens up.",
  "captain.invitations.empty.title": "Create an invitation link",
  "captain.invitations.empty.description":
    "Use Invite to generate a link and share it with the player. Once they accept, they join your roster.",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "shell.nav.open": "Open navigation",
  "shell.nav.title": "Navigation",
  "shell.nav.context": "Active context",
  "shell.nav.competition.overview": "Overview",
  "shell.nav.competition.teams": "Teams",
  "shell.nav.competition.roster": "Roster",
  "shell.nav.competition.teamInvitations": "Team invitations",
  "shell.skipToContent": "Skip to content",
  "roster.role.player": "Player",
  "roster.role.captain": "Captain",
  "roster.role.vice_captain": "Vice-captain",
  "roster.role.aria": "Role of {name}",
  "roster.role.confirmTitle": "Confirm role change",
  "roster.role.confirmDescription": "{name} will become {role}.",
  "roster.role.confirmAction": "Change role",
  "roster.invite.trigger": "Invite",
  "roster.invite.title": "Create roster invitation",
  "roster.invite.description":
    "The link only gives access to this team and respects its current spots and status.",
  "roster.invite.role": "Starting role",
  "roster.invite.rolesRestricted": "Only the captain can invite with another role.",
  "roster.invite.uses": "Uses",
  "roster.invite.uses.single": "Single use",
  "roster.invite.uses.multi": "Multiple uses",
  "roster.invite.invitee": "Recipient (game ID)",
  "roster.invite.inviteePlaceholder": "E.g. davos282",
  "roster.invite.inviteeHint":
    "Optional. The invitation will show up in the invitations of the player who registered that ID.",
  "roster.invite.message": "Message",
  "roster.invite.messagePlaceholder": "Optional. A short message for the invited player.",
  "roster.invite.submit": "Create invitation",
  "roster.link.title": "Link created",
  "roster.link.description":
    "Share it with the player. They accept it from their Futrob account and join your roster.",
  "roster.link.copy": "Copy link",
  "roster.link.copied": "Copied",
  "roster.link.copiedStatus": "Link copied",
  "roster.club.trigger": "Associate club",
  "roster.club.title": "Search for an EA club",
  "roster.club.description":
    "This association only helps locate matches. It does not verify ownership.",
  "roster.club.nameAria": "EA club name",
  "roster.club.placeholder": "E.g. Cuervos",
  "roster.club.search": "Search",
  "roster.club.searching": "Searching…",
  "roster.club.select": "Associate",
  "roster.club.searchFailed": "Unable to search clubs. Check your connection and try again.",
  "roster.club.hint": "Search by name to pick a club.",
  "errors.teams.roster_full": "The roster has reached its maximum size.",
  "errors.teams.roster_entry_inactive":
    "This team is no longer active in the competition. Rosters can't be changed.",
  "errors.teams.roster_competition_conflict":
    "That player already belongs to another team in this competition.",
  "errors.authorization.forbidden": "You don't have permission to manage this team or competition.",
  "errors.teams.roster_invitation_expired": "The invitation has expired. Create a new link.",
  "errors.teams.client_network_error":
    "Unable to reach Futrob. Your context is kept so you can try again.",
  "captain.entryClosed.title": "This entry can't be changed",
  "captain.entryClosed.description":
    "Your team's entry was rejected, so the roster can no longer be modified.",
  "captain.roster.column.platform": "Platform",
  "captain.roster.platform.missing": "No identifier",
  "player.backToWorkspace": "Back to personal workspace",
  "player.retry": "Try again",
  "player.partialData.description": "Some metrics were unavailable in one or more matches.",
  "player.noData": "No data",
  "player.onboarding.checking": "Loading your data…",
  "player.onboarding.failed": "We couldn't check your account",
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
  "player.metric.rating": "Rating",
  "player.metric.matches": "Matches",
  "player.metric.minutes": "Minutes",
  "player.position.unknown": "Position unavailable",
  "landing.meta.title": "Futrob | From the EA match to the official result",
  "landing.meta.description":
    "Run FC Clubs leagues and cups with real EA data: auditable official-match selection, standings, rankings, and a public portal.",
  "landing.nav.aria": "Access",
  "landing.nav.sectionsAria": "Sections",
  "landing.nav.howItWorks": "How it works",
  "landing.nav.portal": "Public portal",
  "landing.nav.login": "Log in",
  "landing.nav.signup": "Create account",
  "landing.hero.title": "From the EA match to the official result",
  "landing.hero.subtitle": "Captains pick the matches that count, and you approve the result.",
  "landing.hero.cta.primary": "Create account",
  "landing.hero.cta.secondary": "See how it works",
  "landing.status.approved": "Approved",
  "landing.status.candidate": "EA candidate",
  "landing.status.selecting": "In selection",
  "landing.status.synced": "EA sync",
  "landing.status.scheduled": "Scheduled",
  "landing.status.published": "Published",
  "landing.board.label": "Example matchday in Futrob",
  "landing.board.matchday": "Matchday 4",
  "landing.board.competition": "Metropolitan League",
  "landing.board.kickoff": "Sat 21:00",
  "landing.mechanism.title": "How a match becomes official",
  "landing.mechanism.subtitle":
    "Every result shows where it comes from and what state it is in. Nothing is published without approval.",
  "landing.mechanism.sync.title": "EA sync",
  "landing.mechanism.sync.description":
    "Futrob syncs your clubs' matches from EA and stores them as candidates, never as official.",
  "landing.mechanism.selection.title": "Selection",
  "landing.mechanism.selection.description":
    "Captains choose which matches count for the encounter, with a series preview.",
  "landing.mechanism.approval.title": "Approval",
  "landing.mechanism.approval.description":
    "The confirmed result is approved and audited. Sync never makes a result official on its own.",
  "landing.mechanism.publication.title": "Publication",
  "landing.mechanism.publication.description":
    "Only approved results update the table, bracket, rankings, and public portal.",
  "landing.reschedule.title": "Reschedule without losing track",
  "landing.reschedule.subtitle":
    "A captain proposes a new time and the opponent responds. Once accepted, the schedule and the EA match search window adjust.",
  "landing.reschedule.guarantee": "An approved or finished match can no longer be rescheduled.",
  "landing.reschedule.panel.label": "Example reschedule request",
  "landing.reschedule.panel.status": "In negotiation",
  "landing.reschedule.panel.sentence":
    "Sporting Lomas proposes moving the whole encounter from October 18, 21:00 to October 19, 22:00.",
  "landing.reschedule.panel.respondBy": "Respond by October 16, 23:59.",
  "landing.reschedule.panel.options": "CD Estrella can accept, counter or reject.",
  "landing.demo.title": "Try it against the real API",
  "landing.demo.subtitle":
    "Search for your EA Clubs team. It is the same data layer that powers your competitions.",
  "gameData.clubSearch.source": "Results from /api/v1/game-data/clubs/search.",
  "gameData.clubSearch.queryLabel": "Club name",
  "gameData.clubSearch.queryPlaceholder": "E.g. Cuervos",
  "gameData.clubSearch.queryRequired": "Enter the club name.",
  "gameData.clubSearch.platformLabel": "Platform",
  "gameData.clubSearch.submit": "Search",
  "gameData.clubSearch.searching": "Searching…",
  "gameData.clubSearch.retryIn": ({ seconds }) => `Retry in ${seconds} s`,
  "gameData.clubSearch.empty": "No results for that search.",
  "gameData.clubSearch.error": "We couldn't search clubs. Please try again.",
  "gameData.clubSearch.rateLimited": "You reached the temporary search limit.",
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
    "Publish cover, teams, schedule, results, table, bracket, and rankings when you decide.",
  "landing.portal.point.teams": "Teams and schedule always up to date",
  "landing.portal.point.results": "Official results and table",
  "landing.portal.point.rankings": "Player and team rankings",
  "landing.portal.podium.caption": "Example official table for the Metropolitan League",
  "landing.portal.podium.points": "points",
  "landing.cta.title": "Publish your first official matchday",
  "landing.cta.subtitle":
    "Create your organization, invite the captains, and set up your first competition.",
  "landing.cta.primary": "Create account",
  "landing.cta.secondary": "See pricing",
  "landing.footer.tagline": "Precise to operate. Clear to compete.",
  "landing.footer.madeBy": "Futrob is made by Davion Software.",
  "encounter.breadcrumb": "Encounter path",
  "encounter.title": ({ home, away }) => `${home} vs ${away}`,
  "encounter.vs": "VS",
  "encounter.side.home": "Home",
  "encounter.side.away": "Away",
  "encounter.round": ({ number }) => `Matchday ${number}`,
  "encounter.roundOf": ({ number, total }) => `Matchday ${number} of ${total}`,
  "encounter.timeZone": ({ zone }) => `Times in ${zone}`,
  "encounter.loading": "Loading encounter",
  "encounter.error": "We couldn't load this encounter.",
  "encounter.notFound.title": "Encounter unavailable",
  "encounter.notFound.description":
    "It isn't part of this competition, or your account can't access it.",
  "encounter.forbidden.title": "No access to this encounter",
  "encounter.forbidden.description":
    "Your account isn't allowed to view this encounter. Ask the organization for access.",
  "encounter.backToEncounters": "Back to encounters",
  "encounters.list.label": "Competition encounters",
  "encounters.list.loading": "Loading encounters",
  "encounters.list.error": "We couldn't load the encounters.",
  "encounters.list.timeZone": ({ zone }) => `Times in ${zone}`,
  "encounters.list.open": ({ home, away }) => `Open ${home} vs ${away}`,
  "encounters.list.slots": ({ count }) =>
    count === 1 ? "1 official match" : `${count} official matches`,
  "encounters.list.status.scheduled": "Scheduled",
  "encounters.list.status.awaiting_result": "Awaiting result",
  "encounters.list.status.official": "Official result",
  "encounters.list.empty.title": "No encounters yet",
  "encounters.list.empty.description":
    "They'll appear here once the competition has a fixture with both teams set.",
  "encounters.list.notFound.title": "Competition unavailable",
  "encounters.list.notFound.description":
    "It isn't part of this organization, or your account can't access its encounters.",
  "disputes.list.label": "Competition disputes",
  "disputes.list.loading": "Loading disputes",
  "disputes.list.error": "We couldn't load the disputes.",
  "disputes.list.timeZone": ({ zone }) => `Times in ${zone}`,
  "disputes.list.open": ({ home, away }) => `Review the dispute for ${home} vs ${away}`,
  "disputes.list.kickoff": ({ when }) => `Kickoff ${when}`,
  "disputes.list.waiting": ({ since }) => `Waiting since ${since}`,
  "disputes.list.status.disputed": "In dispute",
  "disputes.list.status.organizer_review": "Organizer review",
  "disputes.list.team.unnamed": "Team name unavailable",
  "disputes.list.empty.title": "No disputes waiting",
  "disputes.list.empty.description":
    "They'll show up here when a team disputes the official selection or a case moves to organizer review.",
  "disputes.list.notFound.title": "Competition unavailable",
  "disputes.list.notFound.description":
    "It isn't part of this organization, or your account can't review its disputes.",
  "encounter.slots.title": "Official matches",
  "encounter.slots.description":
    "Each match has its own kickoff. Assign an EA match to see the result before you propose it.",
  "encounter.slot.label": ({ slot }) => `Match ${slot}`,
  "encounter.slot.unassigned": "No EA match assigned",
  "encounter.slot.unmatched": "This EA match wasn't played by both teams' clubs.",
  "encounter.slot.clear": ({ slot }) => `Remove EA match from match ${slot}`,
  "encounter.preview.title": "Preview",
  "encounter.preview.note":
    "Only on this screen: nothing is saved or made official. The result counts once the opponent confirms the proposal.",
  "encounter.preview.incomplete": "Assign an EA match to every official match to see the series.",
  "encounter.preview.aggregate": "Aggregate",
  "encounter.preview.result": "Result",
  "encounter.preview.independent":
    "Each match counts on its own; this competition doesn't use an aggregate score.",
  "encounter.preview.modeUnknown":
    "The competition doesn't define how the series is decided yet; check each score.",
  "encounter.outcome.win": ({ team }) => `${team} wins`,
  "encounter.outcome.draw": "Draw",
  "encounter.candidates.title": "Candidate EA matches",
  "encounter.candidates.description":
    "EA matches between both teams' clubs around kickoff. Choosing one sends nothing.",
  "encounter.candidates.window": ({ from, to }) => `Searched between ${from} and ${to}`,
  "encounter.candidates.updated": ({ time }) => `Updated at ${time}`,
  "encounter.candidates.refresh": "Refresh candidates",
  "encounter.candidates.refreshing": "Refreshing candidates",
  "encounter.candidates.refreshFailed":
    "We couldn't refresh. You're seeing the last candidates we loaded.",
  "encounter.candidates.list": "Candidate EA matches",
  "encounter.candidates.empty.title": "No EA matches yet",
  "encounter.candidates.empty.description":
    "There are no EA matches between both clubs around kickoff. Refresh after you play.",
  "encounter.candidates.notConnected.title": "An EA club isn't connected",
  "encounter.candidates.notConnected.side": ({ team }) => `${team} has no EA club connected.`,
  "encounter.candidates.notConnected.description":
    "Candidates appear once both teams connect their EA club.",
  "encounter.candidates.providerMismatch.title": "Clubs on different providers",
  "encounter.candidates.providerMismatch.description":
    "Both teams' clubs use different data providers, so their matches can't be compared.",
  "encounter.candidates.forbidden.title": "Candidates restricted",
  "encounter.candidates.forbidden.description":
    "Only the encounter's teams and the organization can see candidate EA matches.",
  "encounter.candidates.error": "We couldn't load candidate EA matches.",
  "encounter.candidate.label": ({ home, away, time }) => `${home} against ${away}, ${time}`,
  "encounter.candidate.duration": ({ minutes }) => `${minutes} min`,
  "encounter.candidate.durationUnknown": "Duration unknown",
  "encounter.candidate.disconnected": "Someone disconnected",
  "encounter.candidate.forfeit": "Won by forfeit",
  "encounter.candidate.partial": "Partial data",
  "encounter.candidate.unverified": "Unverified data",
  "encounter.candidate.players": ({ count }) =>
    count === 1 ? "1 player recorded" : `${count} players recorded`,
  "encounter.candidate.useIn": ({ slot }) => `Use in match ${slot}`,
  "encounter.candidate.usedIn": ({ slot }) => `In match ${slot}`,
  "encounter.candidate.unused": "Unused",
  "encounter.selection.title": "Official selection",
  "encounter.selection.description":
    "Propose the EA matches that count, answer the opponent's proposal, or open a dispute. Nothing is official until the opponent confirms.",
  "encounter.selection.actingAs": "Acting for",
  "encounter.selection.loading": "Loading the official selection…",
  "encounter.selection.error": "We couldn't load the official selection.",
  "encounter.selection.forbidden": "You can't view or act on this encounter's official selection.",
  "encounter.selection.refresh": "Refresh selection",
  "encounter.selection.refreshFailed":
    "We couldn't refresh the selection. What you see may have changed.",
  "encounter.selection.empty.title": "No proposal yet",
  "encounter.selection.empty.description":
    "Assign an EA match to every official match and propose the selection to the opponent.",
  "encounter.selection.status.none": "No proposal",
  "encounter.selection.status.awaiting_provider_data": "Waiting for provider data",
  "encounter.selection.status.candidates_available": "Candidates available",
  "encounter.selection.status.selection_in_progress": "Selection in progress",
  "encounter.selection.status.awaiting_opponent_confirmation":
    "Waiting for the opponent to confirm",
  "encounter.selection.status.confirmed": "Confirmed",
  "encounter.selection.status.disputed": "Disputed",
  "encounter.selection.status.organizer_review": "Under organizer review",
  "encounter.selection.status.approved": "Approved",
  "encounter.selection.status.voided": "Voided",
  "encounter.selection.version": ({ version }) => `Version ${version}`,
  "encounter.selection.round": ({ round }) => `Round ${round}`,
  "encounter.selection.deadline": ({ date }) => `The opponent can answer until ${date}`,
  "encounter.selection.approved": "Official result approved",
  "encounter.selection.notOfficial": "Not an official result yet, and it produces no statistics.",
  "encounter.selection.noCommands": "Your team has no actions available in this state.",
  "encounter.selection.dispute.title": "Dispute",
  "encounter.selection.dispute.status.open": "Open",
  "encounter.selection.dispute.status.under_review": "Under review",
  "encounter.selection.dispute.status.resolved": "Resolved",
  "encounter.selection.dispute.openedBy": ({ team }) => `Opened by ${team}`,
  "encounter.selection.flags.title": "Integrity warnings",
  "encounter.selection.flags.provider_data_incomplete": ({ match }) =>
    `Incomplete provider data in EA match ${match}`,
  "encounter.selection.flags.provider_match_disconnected": ({ match }) =>
    `A disconnect happened in EA match ${match}`,
  "encounter.selection.proposals.title": "Proposals",
  "encounter.selection.proposal.label": ({ sequence, round }) =>
    `Proposal ${sequence} · round ${round}`,
  "encounter.selection.proposal.current": "Current",
  "encounter.selection.proposal.superseded": "Replaced",
  "encounter.selection.proposal.by": ({ team }) => `From ${team}`,
  "encounter.selection.slot.score": ({ slot, home, homeGoals, awayGoals, away }) =>
    `Match ${slot}: ${home} ${homeGoals}–${awayGoals} ${away}`,
  "encounter.selection.slot.unmatched": ({ slot }) => `Match ${slot}: played by other clubs`,
  "encounter.selection.slot.missing": ({ slot }) => `Match ${slot}: no longer among the candidates`,
  "encounter.selection.slot.match": ({ match }) => `EA match ${match}`,
  "encounter.selection.slot.played": ({ match, time }) => `EA match ${match} · played ${time}`,
  "encounter.selection.slot.empty": ({ slot }) => `Match ${slot}: no EA match assigned`,
  "encounter.selection.history.title": "Selection history",
  "encounter.selection.history.byOperator": "Organization",
  "encounter.selection.history.bySystem": "System",
  "encounter.selection.history.action.proposed": "Proposal sent",
  "encounter.selection.history.action.confirmed": "Proposal confirmed",
  "encounter.selection.history.action.approved": "Result approved",
  "encounter.selection.history.action.integrity_review_required": "Integrity review required",
  "encounter.selection.history.action.rejected": "Proposal rejected",
  "encounter.selection.history.action.alternative_proposed": "Alternative proposed",
  "encounter.selection.history.action.dispute_opened": "Dispute opened",
  "encounter.selection.history.action.review_started": "Review started",
  "encounter.selection.history.action.dispute_resolved_approved": "Dispute resolved with approval",
  "encounter.selection.history.action.returned_to_selection": "Returned to selection",
  "encounter.selection.history.action.voided": "Result voided",
  "encounter.selection.history.action.reference_reuse_rejected":
    "EA match already used in another encounter",
  "encounter.selection.history.action.legacy_review_required": "Review required for earlier data",
  "encounter.selection.history.action.confirmation_expired": "Confirmation window expired",
  "encounter.selection.team.unknown": "Unidentified team",
  "encounter.selection.command.propose.trigger": "Propose selection",
  "encounter.selection.command.propose.title": "Propose the selection to the opponent",
  "encounter.selection.command.propose.description":
    "The opponent gets these EA matches to confirm, reject, or replace with others.",
  "encounter.selection.command.propose.submit": "Send proposal",
  "encounter.selection.command.propose.success": "Proposal sent to the opponent.",
  "encounter.selection.command.confirm.trigger": "Confirm proposal",
  "encounter.selection.command.confirm.title": "Confirm the opponent's proposal",
  "encounter.selection.command.confirm.description":
    "Without integrity warnings, the selection is approved as the official result.",
  "encounter.selection.command.confirm.submit": "Confirm",
  "encounter.selection.command.confirm.success": "Proposal confirmed.",
  "encounter.selection.command.reject.trigger": "Reject",
  "encounter.selection.command.reject.title": "Reject the proposal",
  "encounter.selection.command.reject.description":
    "The selection goes to dispute and the organization decides. Nothing becomes official.",
  "encounter.selection.command.reject.submit": "Reject proposal",
  "encounter.selection.command.reject.success": "Proposal rejected. The selection is now disputed.",
  "encounter.selection.command.propose_alternative.trigger": "Propose alternative",
  "encounter.selection.command.propose_alternative.title": "Propose other EA matches",
  "encounter.selection.command.propose_alternative.description":
    "Choosing the same matches as the current proposal counts as confirming it. Choosing others sends the selection to dispute, and the organization decides which count.",
  "encounter.selection.command.propose_alternative.submit": "Send alternative",
  "encounter.selection.command.propose_alternative.success":
    "Alternative sent. If it matches the current proposal, it counts as a confirmation; otherwise the organization resolves the dispute.",
  "encounter.selection.command.open_dispute.trigger": "Open dispute",
  "encounter.selection.command.open_dispute.title": "Open a dispute",
  "encounter.selection.command.open_dispute.description":
    "The organization reviews the case. Meanwhile nothing becomes official.",
  "encounter.selection.command.open_dispute.submit": "Open dispute",
  "encounter.selection.command.open_dispute.success": "Dispute opened.",
  "encounter.selection.dialog.submitting": "Sending…",
  "encounter.selection.dialog.cancel": "Cancel",
  "encounter.selection.dialog.retry": "Try again",
  "encounter.selection.dialog.slots": "Matches you're sending",
  "encounter.selection.dialog.slotsIncomplete":
    "Assign an EA match to every official match before sending.",
  "encounter.selection.dialog.target": "Proposal you're answering",
  "encounter.selection.reason.label": "Reason",
  "encounter.selection.reason.help":
    "Required. The opponent and the organization will see it. Up to 1000 characters.",
  "encounter.selection.reason.required": "Write a reason to continue.",
  "encounter.selection.conflict": ({ from, to }) =>
    `The selection changed: you read version ${from} and it's now at version ${to}. Check the current state; your draft is kept and nothing was resent.`,
  "encounter.selection.conflictStale": ({ from }) =>
    `The selection changed since version ${from}. Refresh to see the current state; your draft is kept.`,
  "encounter.selection.unavailable": "This action is no longer available in the current state.",
  "encounter.selection.unknown":
    "We don't know whether it was saved because the connection failed. Trying again sends the same request without duplicating it.",
  "errors.results.reason_required": "Write a reason to continue.",
  "errors.results.invalid_selection": "The selection isn't valid. Check the assigned EA matches.",
  "errors.results.duplicate_provider_match": "You used the same EA match in two official matches.",
  "encounter.selection.proposal.approved": "Approved",
  "encounter.selection.proposal.closedRound": "Closed round",
  "encounter.selection.history.selected": ({ proposal }) => `Chosen proposal: ${proposal}`,
  "encounter.selection.history.acknowledged": ({ count }) =>
    count === 1 ? "1 integrity warning acknowledged" : `${count} integrity warnings acknowledged`,
  "encounter.selection.outcome.approved": "Approved matches",
  "encounter.selection.outcome.byAgreement": "by agreement between the teams",
  "encounter.selection.outcome.byOperator": "by organization decision",
  "encounter.selection.outcome.resolution": "Latest decision",
  "encounter.selection.outcome.approved_proposal": "The organization approved a proposal.",
  "encounter.selection.outcome.returned_to_selection":
    "The organization returned the case to selection. The teams have to agree on a new proposal.",
  "encounter.review.title": "Organization review",
  "encounter.review.description":
    "Review the dispute, take the case and decide. Only people who approve results see this, and it's never published.",
  "encounter.review.loading": "Loading the case file…",
  "encounter.review.error": "We couldn't load the case file.",
  "encounter.review.forbidden": "You can't review disputes for this encounter.",
  "encounter.review.refresh": "Refresh case file",
  "encounter.review.refreshFailed":
    "We couldn't refresh the case file. What you see may have changed.",
  "encounter.review.tabs.label": "Case file",
  "encounter.review.tabs.case": "Current case",
  "encounter.review.tabs.history": "History",
  "encounter.review.empty": "No proposals in this encounter yet.",
  "encounter.review.historyEmpty": "No actions recorded yet.",
  "encounter.review.noCommands": "The organization has no decisions pending in this state.",
  "encounter.review.reason.help":
    "Required. It stays in the history and both teams will see it. Up to 1000 characters.",
  "encounter.review.command.review_dispute.trigger": "Take the case",
  "encounter.review.command.review_dispute.title": "Take the case",
  "encounter.review.command.review_dispute.description":
    "The dispute moves to organization review and the teams can no longer change it. Taking the case approves nothing.",
  "encounter.review.command.review_dispute.submit": "Take the case",
  "encounter.review.command.review_dispute.success":
    "You took the case. It's now under organization review.",
  "encounter.review.command.approve_proposal.trigger": "Approve a proposal",
  "encounter.review.command.approve_proposal.title": "Approve a proposal",
  "encounter.review.command.approve_proposal.description":
    "The proposal you choose becomes the official result and produces statistics.",
  "encounter.review.command.approve_proposal.submit": "Approve proposal",
  "encounter.review.command.approve_proposal.success":
    "Proposal approved. The result is now official.",
  "encounter.review.command.return_to_selection.trigger": "Return to selection",
  "encounter.review.command.return_to_selection.title": "Return the case to selection",
  "encounter.review.command.return_to_selection.description":
    "This round's proposals close and the teams have to agree on a new selection.",
  "encounter.review.command.return_to_selection.submit": "Return to selection",
  "encounter.review.command.return_to_selection.success": "Case returned to selection.",
  "encounter.review.dialog.dispute": "Dispute you're taking",
  "encounter.review.dialog.choose": "Proposal you're approving",
  "encounter.review.dialog.chooseRequired": "Choose the proposal you're approving.",
  "encounter.review.dialog.willApprove": "Will be approved",
  "encounter.review.dialog.flags": "Integrity warnings for this proposal",
  "encounter.review.dialog.acknowledge": "I reviewed the integrity warnings and approve anyway",
  "encounter.review.dialog.acknowledgeRequired":
    "Confirm you reviewed the integrity warnings to approve.",
  "encounter.review.dialog.willClose": "Proposals that close",
  "encounter.review.dialog.noResult": "No official result is created.",
  "errors.results.integrity_flags_not_acknowledged":
    "This proposal has integrity warnings. Confirm you reviewed them to approve it.",
  "errors.results.reference_already_claimed":
    "An EA match in this proposal already counts in another encounter.",
  "errors.results.candidate_not_associated":
    "An EA match in this proposal is no longer a candidate for this encounter.",
  "errors.results.provider_match_snapshot_missing":
    "Data for an EA match in this proposal is missing. Try again later.",
  "errors.results.proposal_not_found": "That proposal no longer belongs to the current round.",
  "landing.footer.legal": "© 2026 Futrob",
  "shell.sidebar.label": "Primary navigation",
  "shell.sidebar.collapse": "Collapse sidebar",
  "shell.sidebar.expand": "Expand sidebar",
  "shell.nav.general": "General",
  "shell.nav.home": "Home",
  "shell.nav.competitions": "Competitions",
  "shell.nav.invitations": "Invitations",
  "shell.nav.teams": "Teams",
  "shell.nav.players": "Players",
  "shell.nav.settings": "Settings",
  "shell.account.open": "Open account menu",
  "shell.account.signOut": "Sign out",
  "shell.account.fallback": "Account",
  "shell.account.profile": "Profile",
  "shell.account.feedback": "Send feedback",
  "shell.account.settings": "Settings",
  "shell.account.providerHealth": "Provider health",
  "shell.account.planAdmin": "Plans and requests",
  "pages.admin.billing.title": "Plans and requests",
  "pages.admin.billing.subtitle":
    "Organizations' plan requests and manual assignment. For superusers only.",
  "billing.admin.checkingAccess": "Checking permissions…",
  "billing.admin.accessUnavailable": "We couldn't check your permissions for this panel.",
  "billing.admin.denied.title": "You don't have access to this panel",
  "billing.admin.denied.description": "Assigning plans is for superusers only.",
  "billing.admin.loading": "Loading requests…",
  "billing.admin.error": "We couldn't load the requests.",
  "billing.admin.queue.title": "Pending requests",
  "billing.admin.queue.empty": "There are no pending requests.",
  "billing.admin.queue.organization": "Organization",
  "billing.admin.queue.plan": "Requested plan",
  "billing.admin.queue.date": "Requested on",
  "billing.admin.queue.action": "Action",
  "billing.admin.queue.assignLabel": "Assign",
  "billing.admin.queue.assign": "Assign {plan} to {organization}",
  "billing.admin.form.title": "Assign a plan",
  "billing.admin.form.description":
    "Use it once payment is confirmed outside the product. The change is recorded in the organization's history.",
  "billing.admin.form.organizationId": "Organization ID",
  "billing.admin.form.plan": "Plan",
  "billing.admin.form.reason": "Reason",
  "billing.admin.form.reasonHint": "E.g. payment received by bank transfer on November 10.",
  "billing.admin.form.submit": "Assign plan",
  "billing.admin.form.submitting": "Assigning…",
  "billing.admin.form.success": "We assigned the {plan} plan to organization {organizationId}.",
  "billing.admin.form.forbidden": "You don't have permission to assign plans.",
  "billing.admin.form.notFound": "We couldn't find that organization.",
  "billing.admin.form.error": "We couldn't assign the plan. Check the details and try again.",
  "providerHealth.title": "EA provider health",
  "providerHealth.subtitle":
    "Status, metrics and recent failures of the EA Clubs integration. Superusers only.",
  "providerHealth.refresh": "Refresh",
  "providerHealth.checkingAccess": "Checking permissions…",
  "providerHealth.loading": "Loading provider health…",
  "providerHealth.error": "We couldn't load the provider health.",
  "providerHealth.refreshError": "We couldn't refresh the data. What you see may be out of date.",
  "providerHealth.denied.title": "You don't have access to this panel",
  "providerHealth.denied.description": "The provider health panel is for superusers only.",
  "providerHealth.accessUnavailable": "We couldn't check your permissions for this panel.",
  "providerHealth.empty.title": "No provider activity yet",
  "providerHealth.empty.description":
    "Once EA Clubs is queried, the observation window metrics will show up here.",
  "providerHealth.status.label": "Status",
  "providerHealth.status.healthy": "Healthy",
  "providerHealth.status.degraded": "Degraded",
  "providerHealth.status.unavailable": "Unavailable",
  "providerHealth.status.unknown": "No data",
  "providerHealth.circuit.label": "Circuit",
  "providerHealth.circuit.closed": "Closed",
  "providerHealth.circuit.half_open": "Half open",
  "providerHealth.circuit.open": "Open",
  "providerHealth.metrics": "Window metrics",
  "providerHealth.metric.sample": "Sample size",
  "providerHealth.metric.successRate": "Success rate",
  "providerHealth.metric.latency": "Average latency",
  "providerHealth.metric.cacheHitRate": "Cache hit rate",
  "providerHealth.metric.unit.ms": "ms",
  "providerHealth.metric.unavailable": "No data",
  "providerHealth.window.title": "Observation window",
  "providerHealth.window.startedAt": "Since",
  "providerHealth.window.observedAt": "Observed",
  "providerHealth.calls.title": "Provider calls",
  "providerHealth.calls.success": "Succeeded",
  "providerHealth.calls.failure": "Failed",
  "providerHealth.calls.lastSuccess": "Last success",
  "providerHealth.calls.lastFailure": "Last failure",
  "providerHealth.calls.never": "None in the window",
  "providerHealth.failures.title": "Recent failures",
  "providerHealth.failures.none": "No failures in the observation window.",
  "providerHealth.failures.some":
    "The provider recorded failures in the observation window. Per-error detail is not exposed in this panel.",
  "providerHealth.cache.title": "Cache",
  "providerHealth.cache.hits": "Hits",
  "providerHealth.cache.misses": "Misses",
  "providerHealth.cache.stale": "Stale served",
  "encounter.documentTitle": "Encounter",
  "encounters.list.documentTitle": "Encounters",
  "matches.list.documentTitle": "Matches",
  "pages.competition.stats.title": "Team statistics",
  "pages.competition.stats.subtitle":
    "Official totals and averages for each team, calculated from approved results.",
  "competition.teamStats.documentTitle": "Team statistics",
  "competition.teamStats.loading": "Loading team statistics…",
  "competition.teamStats.error": "We couldn't load the team statistics.",
  "competition.teamStats.accessError": "We couldn't check your access to these statistics.",
  "competition.teamStats.refreshFailed":
    "We couldn't refresh the statistics. Showing the last data loaded.",
  "competition.teamStats.forbidden.title": "You don't have access to these statistics",
  "competition.teamStats.forbidden.description":
    "Team statistics for this competition are available to its organizers.",
  "competition.teamStats.forbidden.back": "Back to the organization",
  "competition.teamStats.notFound.title": "Competition unavailable",
  "competition.teamStats.notFound.description":
    "We couldn't find this competition in the organization, or it's no longer available.",
  "competition.teamStats.empty.title": "No official statistics yet",
  "competition.teamStats.empty.description":
    "Each team's statistics appear once its first official result is approved.",
  "competition.teamStats.empty.action": "View encounters",
  "competition.teamStats.summary.label": "Team statistics summary",
  "competition.teamStats.summary.teams": "Teams with statistics",
  "competition.teamStats.summary.updated": "Updated: {date}",
  "competition.teamStats.summary.goals": "Most goals",
  "competition.teamStats.summary.assists": "Most assists",
  "competition.teamStats.summary.rating": "Best average rating",
  "competition.teamStats.leader.tied": "{team} and {count} more",
  "competition.teamStats.leader.partial": "{teams} · partial data",
  "competition.teamStats.comparison.title": "Team comparison",
  "competition.teamStats.comparison.description":
    "Sort by any column. “—” marks a value that wasn't recorded.",
  "competition.teamStats.view.label": "Show figures",
  "competition.teamStats.view.totals": "Totals",
  "competition.teamStats.view.averages": "Per match",
  "competition.teamStats.view.per90": "Per 90 min",
  "competition.teamStats.table.label": "Official statistics per team: {view}",
  "competition.teamStats.column.team": "Team",
  "competition.teamStats.column.mvpAwards": "MVP",
  "competition.teamStats.column.rating": "Average rating",
  "competition.teamStats.sort.ascending": "ascending order",
  "competition.teamStats.sort.descending": "descending order",
  "competition.teamStats.partial.marker": "partial data",
  "competition.teamStats.partial.title": "Partial data",
  "competition.teamStats.partial.description":
    "Some approved matches didn't record every metric. Figures marked * only count the matches that have the value.",
  "competition.teamStats.unavailable": "No data",
  "competition.teamStats.teamName.unavailable": "Team name unavailable",
  "competition.teamStats.teamName.loading": "Loading team name",
  "competition.teamStats.teamName.error":
    "We couldn't load the team names. The figures are still available.",
  "competition.teamStats.teamName.denied":
    "You don't have access to the team names. The figures are still available.",
  "competition.teamStats.teamName.refreshFailed":
    "We couldn't refresh the team names. Showing the last ones loaded.",
  "standings.documentTitle": "Standings",
  "standings.loading": "Loading the standings",
  "standings.error": "We couldn't load the standings.",
  "standings.refreshError":
    "We couldn't refresh the standings. You're seeing the last successful read.",
  "standings.teamNames.refreshError":
    "We couldn't refresh the team names. You're seeing the last names loaded.",
  "standings.accessError": "We couldn't check your access to the standings.",
  "standings.forbidden.title": "You can't view the standings",
  "standings.forbidden.description":
    "Your account doesn't have permission to see this competition's official table.",
  "standings.forbidden.back": "Back to the organization",
  "standings.notFound.title": "We couldn't find this competition",
  "standings.notFound.description":
    "The competition no longer exists or the link is wrong. This isn't a permissions problem or a temporary failure.",
  "standings.notFound.action": "View competitions",
  "standings.empty.title": "No official standings yet",
  "standings.empty.description":
    "The table is built only from approved official results and will appear once the first one is approved. EA matches that aren't approved don't count.",
  "standings.empty.action": "View encounters",
  "standings.table.label": "Official standings",
  "standings.table.updated": ({ time }) => `Updated ${time}`,
  "standings.table.formula": ({ version }) => `Formula ${version}`,
  "standings.teamNames.error":
    "We couldn't load the team names. The table shows the figures with a generic name.",
  "standings.team.loading": "Loading team name",
  "standings.team.unresolved": "Team name unavailable",
  "standings.col.position": "Pos.",
  "standings.col.position.full": "Position",
  "standings.col.team": "Team",
  "standings.col.played": "P",
  "standings.col.played.full": "Matches played",
  "standings.col.goalDifference": "GD",
  "standings.col.goalDifference.full": "Goal difference",
  "standings.col.points": "Pts",
  "standings.col.points.full": "Points",
  "standings.col.buchholz": "Buch.",
  "standings.col.buchholz.full": "Buchholz: sum of the opponents' points",
  "standings.swiss.round": ({ current, total }) => `Round ${current} of ${total}`,
  "standings.swiss.completed": ({ completed, total }) =>
    `${completed} of ${total} rounds completed`,
  "standings.swiss.final": "Final standings",
  "standings.swiss.tiebreak":
    "Ties: Buchholz first (opponents' points), then goal difference and goals for.",
  "standings.swiss.byes": ({ count }) => (Number(count) === 1 ? "1 bye" : `${count} byes`),
  "standings.swiss.withdrawn": "Withdrawn",
  "standings.col.form": "Form",
  "standings.col.form.full": "Last 5 matches, most recent last",
  "standings.form.win": "Win",
  "standings.form.win.short": "W",
  "standings.form.draw": "Draw",
  "standings.form.draw.short": "D",
  "standings.form.loss": "Loss",
  "standings.form.loss.short": "L",
  "standings.playoffCut": ({ count }) =>
    count === 1
      ? "The top team advances to the playoffs"
      : `The top ${ENGLISH_SMALL_NUMBERS[Number(count)] ?? count} advance to the playoffs`,
  "competition.overview.documentTitle": "Overview",
  "competition.overview.description":
    "Status, teams, upcoming encounters and pending work for the competition.",
  "competition.overview.loading": "Loading the competition",
  "competition.overview.error": "We couldn't load the competition.",
  "competition.overview.accessError": "We couldn't check your access to the competition.",
  "competition.overview.memberTitle": "You are part of the competition",
  "competition.overview.memberDescription":
    "Your access is ready. Use the menu to see your matches, statistics and team.",
  "competition.overview.status": "Competition status",
  "competition.overview.continueSetup": "Continue setup",
  "competition.overview.kpi.label": "Competition indicators",
  "competition.overview.kpi.teams": "Approved teams",
  "competition.overview.kpi.applications": "Entries to review",
  "competition.overview.kpi.upcoming": "Upcoming encounters",
  "competition.overview.kpi.awaiting": "No official result",
  "competition.overview.pending.title": "Pending",
  "competition.overview.pending.applications": ({ count }) =>
    Number(count) === 1 ? "1 team entry to review" : `${count} team entries to review`,
  "competition.overview.pending.awaiting": ({ count }) =>
    Number(count) === 1
      ? "1 encounter without an official result"
      : `${count} encounters without an official result`,
  "competition.overview.pending.activities": "Open tasks",
  "competition.overview.pending.error": "We couldn't load all the pending tasks.",
  "competition.overview.pending.empty.title": "All caught up",
  "competition.overview.pending.empty.description":
    "No entries, results or disputes are waiting for your review.",
  "competition.overview.upcoming.title": "Upcoming encounters",
  "competition.overview.upcoming.viewAll": "View all",
  "competition.overview.upcoming.error": "We couldn't load the encounters.",
  "competition.overview.upcoming.empty.title": "No scheduled encounters",
  "competition.overview.upcoming.empty.description":
    "When the schedule has encounters left to play, you will see them here.",
  "competition.overview.teams.title": "Teams",
  "competition.overview.teams.viewAll": "View all",
  "competition.overview.teams.error": "We couldn't load the teams.",
  "competition.overview.teams.empty.title": "No teams yet",
  "competition.overview.teams.empty.description":
    "Invite captains or approve applications to fill the competition.",
  "competition.overview.teams.empty.action": "Manage teams",
  "competition.overview.teams.roster": ({ count, max }) => `${count} of ${max} players`,
  "competition.overview.teams.entry.pending": "To review",
  "competition.overview.teams.entry.approved": "Approved",
  "fixture.documentTitle": "Schedule",
  "fixture.loading": "Loading the schedule",
  "fixture.error": "We couldn't load the schedule.",
  "fixture.refreshError":
    "We couldn't refresh the schedule. You're seeing the last successful read.",
  "fixture.notFound.title": "Competition unavailable",
  "fixture.notFound.description":
    "It may have been removed, or you may not have access to its schedule.",
  "fixture.empty.title": "No schedule yet",
  "fixture.empty.description":
    "Once the fixture is generated, each stage and its rounds will show up here.",
  "fixture.timeZone": ({ zone }) => `Times in ${zone}`,
  "fixture.round.pending": ({ number }) => `Paired once round ${number} is official`,
  "fixture.round.expected": ({ date }) => `Expected date: ${date}`,
  "fixture.bye": ({ team }) => `${team} has a bye`,
  "fixture.closed": "Not played",
  "fixture.side.withdrawn": "Withdrawn",
  "fixture.swiss.progress": ({ paired, total }) => `Rounds paired: ${paired} of ${total}`,
  "fixture.swiss.withdrawn": ({ teams }) => `Withdrawn: ${teams}`,
  "fixture.generate.title": "Generate the schedule",
  "fixture.generate.description": ({ count }) =>
    `Round 1 is paired now with the ${count} approved teams. Later rounds pair themselves once the previous one is official.`,
  "fixture.generate.start": "Round 1 start",
  "fixture.generate.startInvalid": "Enter a future date and time.",
  "fixture.generate.interval": "Days between rounds",
  "fixture.generate.intervalInvalid": "Enter a whole number of days, from 1.",
  "fixture.generate.rounds": "Number of rounds",
  "fixture.generate.roundsHint": ({ recommended, max }) =>
    `Recommended: ${recommended}. Maximum: ${max}.`,
  "fixture.generate.roundsInvalid": ({ max }) => `Enter between 1 and ${max} rounds.`,
  "fixture.generate.submit": "Generate schedule",
  "fixture.generate.done": "Schedule generated.",
  "fixture.generate.needTeams": "Generating the schedule takes at least 2 approved teams.",
  "fixture.action.reason": "Reason",
  "fixture.action.reasonRequired": "Enter the reason.",
  "fixture.close.trigger": "Close round without result",
  "fixture.close.title": ({ number }) => `Close round ${number} without result`,
  "fixture.close.description":
    "Encounters in this round without an official result become not played: their open selection is cancelled, nobody scores and those teams count as having met. The next round is paired right away. This cannot be undone.",
  "fixture.close.confirm": "Confirm closing",
  "fixture.close.done": ({ number }) => `Round ${number} closed without result.`,
  "fixture.withdraw.trigger": "Withdraw team",
  "fixture.withdraw.title": "Withdraw a team",
  "fixture.withdraw.description":
    "The team stops being paired and cannot rejoin. In its match without a result the open selection is cancelled and the rival gets a bye, which scores like a win. Its official results stay and it remains in the standings, marked as withdrawn.",
  "fixture.withdraw.team": "Team",
  "fixture.withdraw.teamPlaceholder": "Select a team",
  "fixture.withdraw.teamRequired": "Select the team.",
  "fixture.withdraw.confirm": "Confirm withdrawal",
  "fixture.withdraw.done": ({ team }) => `${team} is withdrawn.`,
  "fixture.recovery.unknown":
    "We don't know whether it applied. Try again: if it already applied, it won't repeat.",
  "fixture.recovery.roundNotCurrent":
    "That round is no longer the one being played. Check the updated schedule.",
  "fixture.recovery.alreadyWithdrawn": "That team was already withdrawn.",
  "fixture.recovery.notParticipant": "That team doesn't play this schedule.",
  "fixture.recovery.notSwiss": "This schedule isn't a Swiss system.",
  "fixture.recovery.conflict":
    "The schedule changed while you were sending the action. Review it and try again.",
  "fixture.recovery.planGone": "This schedule is no longer current. Check the current one.",
  "fixture.recovery.generationConflict":
    "A schedule with different data already exists. Check the current schedule.",
  "fixture.recovery.notPublished": "Publish the competition to generate its schedule.",
  "fixture.recovery.permission": "You no longer have permission to manage this schedule.",
  "fixture.recovery.invalidGenerate":
    "The server rejected this data. Check the number of rounds and that at least 2 teams are approved.",
  "fixture.recovery.invalidCommand":
    "We couldn't accept this action. Close it, open the dialog again and retry.",
  "errors.scheduling.not_swiss_fixture": "This schedule isn't a Swiss system.",
  "errors.scheduling.swiss_round_not_current": "That round is no longer the one being played.",
  "errors.scheduling.swiss_team_already_withdrawn": "That team was already withdrawn.",
  "errors.scheduling.swiss_team_not_participant": "That team doesn't play this schedule.",
  "errors.scheduling.invalid_fixture_configuration": "The schedule configuration isn't valid.",
  "errors.scheduling.fixture_source_not_published":
    "Publish the competition to generate its schedule.",
  "errors.scheduling.fixture_generation_conflict": "A schedule with different data already exists.",
  "fixture.round.matchday": ({ number }) => `Matchday ${number}`,
  "fixture.round.final": "Final",
  "fixture.round.semifinal": "Semifinals",
  "fixture.round.quarterfinal": "Quarterfinals",
  "fixture.round.roundOf16": "Round of 16",
  "fixture.round.number": ({ number }) => `Round ${number}`,
  "fixture.side.unknownTeam": "Team unavailable",
  "fixture.side.bye": "Bye",
  "fixture.side.winner.unknown": "Winner to be decided",
  "fixture.side.winner.final": "Winner of the final",
  "fixture.side.winner.semifinal": ({ order }) => `Winner of semifinal ${order}`,
  "fixture.side.winner.quarterfinal": ({ order }) => `Winner of quarterfinal ${order}`,
  "fixture.side.winner.roundOf16": ({ order }) => `Winner of round of 16 match ${order}`,
  "fixture.side.winner.matchday": ({ number, order }) =>
    `Winner of match ${order} on matchday ${number}`,
  "fixture.side.winner.round": ({ number, order }) => `Winner of match ${order} in round ${number}`,
  "fixture.side.groupRank": ({ place, group }) => `${place} in group ${group}`,
  "fixture.side.stageRank": ({ place, stage }) => `${place} in ${stage}`,
  "fixture.slots": ({ count }) => (Number(count) === 1 ? "1 match" : `${count} matches`),
  "fixture.group": ({ group }) => `Group ${group}`,
  "fixture.open": ({ home, away }) => `Open ${home} vs ${away}`,
  "fixture.openAt": ({ home, away, date }) => `Open ${home} vs ${away}, ${date}`,
  "fixture.views.label": "Schedule view",
  "fixture.views.agenda": "Agenda",
  "fixture.views.month": "Calendar",
  "fixture.views.rounds": "Rounds",
  "fixture.filters.label": "Filter encounters",
  "fixture.filters.team": "Team",
  "fixture.filters.allTeams": "All teams",
  "fixture.filters.round": "Round",
  "fixture.filters.allRounds": "All rounds",
  "fixture.filters.roundOption": ({ stage, round }) => `${stage} · ${round}`,
  "fixture.filters.reset": "Clear filters",
  "fixture.filtered.title": "No encounters match these filters",
  "fixture.filtered.description": "Try another team or show every round.",
  "fixture.encounters": ({ count }) =>
    Number(count) === 1 ? "1 encounter" : `${count} encounters`,
  "fixture.summary": ({ count, dates }) =>
    `${Number(count) === 1 ? "1 encounter" : `${count} encounters`} on ${
      Number(dates) === 1 ? "1 date" : `${dates} dates`
    }`,
  "fixture.agenda.label": "Encounters by date",
  "fixture.agenda.nextDate": "Next date",
  "fixture.agenda.overview": "Schedule overview",
  "fixture.agenda.noNextDate": "No dates ahead",
  "fixture.agenda.dates": "Dates",
  "fixture.agenda.encounters": "Encounters",
  "fixture.agenda.timeZone": "Time zone",
  "fixture.month.label": "Schedule month",
  "fixture.month.previous": "Previous month",
  "fixture.month.next": "Next month",
  "fixture.month.goToNext": "Next date",
  "fixture.month.day": ({ date, count }) =>
    `${date}: ${Number(count) === 1 ? "1 encounter" : `${count} encounters`}`,
  "fixture.month.more": ({ count }) => `+${count} more`,
  "fixture.month.selectedDay": "Selected day",
  "fixture.month.emptyDay": "No encounters on this day.",
  "fixture.month.emptyMonth": "No encounters this month.",
  "fixture.month.goTo": ({ month }) => `Go to ${month}`,
  "fixture.rounds.current": "Up next",
  "fixture.rounds.emptyRound": "No encounters match these filters.",
  "fixture.rounds.scroll": ({ stage }) => `${stage} rounds`,
  "portal.nav.label": "Competition sections",
  "portal.section.cover": "Overview",
  "portal.section.calendar": "Fixtures and results",
  "portal.section.standings": "Table",
  "portal.section.bracket": "Bracket",
  "portal.section.teams": "Teams",
  "portal.section.rankings": "Rankings",
  "portal.section.rules": "Rules",
  "portal.status.published": "In play",
  "portal.status.paused": "Paused",
  "portal.status.finished": "Finished",
  "portal.header.eyebrow": "Public competition",
  "portal.header.teams": ({ count }) => (count === 1 ? "1 team" : `${count} teams`),
  "portal.header.timeZone": ({ zone }) => `Times in ${zone}`,
  "portal.footer.poweredBy": "Published with Futrob",
  "portal.footer.home": "Discover Futrob",
  "portal.meta.description": ({ name }) =>
    `Fixtures, results, table, bracket and rankings for ${name}, published on Futrob.`,
  "portal.loading": "Loading the section",
  "portal.error.title": "We couldn't load this section",
  "portal.error.description": "It may be a temporary problem. Try again in a few seconds.",
  "portal.error.retry": "Try again",
  "portal.notFound.title": "This competition isn't available",
  "portal.notFound.description":
    "Check the link. If it is right, the competition isn't published yet.",
  "portal.notFound.action": "Go to Futrob",
  "portal.cover.upcoming": "Upcoming encounters",
  "portal.cover.upcoming.empty": "No encounters left to play.",
  "portal.cover.results": "Latest results",
  "portal.cover.results.empty": "No official results yet.",
  "portal.cover.calendarLink": "See all fixtures",
  "portal.noFixture.title": "The fixtures aren't published yet",
  "portal.noFixture.description":
    "Once the organization generates the fixtures, every round and its results show up here.",
  "portal.calendar.round": ({ round }) => `Round ${round}`,
  "portal.encounter.status.scheduled": "Scheduled",
  "portal.encounter.status.awaiting_result": "Awaiting result",
  "portal.encounter.status.official": "Official",
  "portal.encounter.status.closed": "Closed",
  "portal.encounter.versus": "vs",
  "portal.encounter.label": ({ home, away }) => `${home} against ${away}`,
  "portal.encounter.score": ({ score }) => `Official score ${score}`,
  "portal.standings.caption": "Official table, built only from officialized results.",
  "portal.standings.empty.title": "No table yet",
  "portal.standings.empty.description":
    "The table appears once the organization officializes the first result.",
  "portal.standings.col.wins": "W",
  "portal.standings.col.wins.full": "Won",
  "portal.standings.col.draws": "D",
  "portal.standings.col.draws.full": "Drawn",
  "portal.standings.col.losses": "L",
  "portal.standings.col.losses.full": "Lost",
  "portal.standings.col.goalsFor": "GF",
  "portal.standings.col.goalsFor.full": "Goals for",
  "portal.standings.col.goalsAgainst": "GA",
  "portal.standings.col.goalsAgainst.full": "Goals against",
  "portal.bracket.stage.knockout": "Knockout",
  "portal.bracket.stage.playoffs": "Playoffs",
  "portal.bracket.round": ({ round }) => `Round ${round}`,
  "portal.bracket.encounter": ({ order }) => `Tie ${order}`,
  "portal.bracket.side.bye": "Bye",
  "portal.bracket.side.winner": ({ round, order }) => `Winner of tie ${order} (round ${round})`,
  "portal.bracket.side.groupRank": ({ group, rank }) => `Group ${group}, place ${rank}`,
  "portal.bracket.side.stageRank": ({ rank }) => `Place ${rank} of the previous stage`,
  "portal.bracket.side.pending": "To be decided",
  "portal.teams.empty.title": "No confirmed teams yet",
  "portal.teams.empty.description":
    "Teams show up here once the organization approves their entry.",
  "portal.rankings.kinds": "Ranking type",
  "portal.rankings.col.player": "Player",
  "portal.rankings.col.team": "Team",
  "portal.rankings.col.matches": "MP",
  "portal.rankings.col.matches.full": "Matches played",
  "portal.rankings.empty.title": "No data for this ranking yet",
  "portal.rankings.empty.description": "Rankings are built from the stats of officialized matches.",
  "portal.rules.format": "Format",
  "portal.rules.teams": "Teams",
  "portal.rules.teams.range": ({ min, max }) => `${min} to ${max}`,
  "portal.rules.teams.min": ({ min }) => `From ${min}`,
  "portal.rules.roster": "Maximum roster",
  "portal.rules.roster.value": ({ count }) => `${count} players`,
  "portal.rules.roster.default": "The platform default",
  "portal.rules.stage.regular": "Regular stage",
  "portal.rules.stage.knockout": "Knockout",
  "portal.rules.points": "Points (win, draw, loss)",
  "portal.rules.matches": "Official matches per encounter",
  "portal.rules.resolution": "How an encounter is decided",
  "portal.rules.resolution.independent_matches": "Each match counts on its own",
  "portal.rules.resolution.aggregate_score": "Aggregate score",
  "portal.rules.rescheduling": "Rescheduling",
  "portal.rules.rescheduling.none": "Not allowed",
  "portal.rules.rescheduling.limited": ({ count, hours }) =>
    `Up to ${count} per team, with ${hours} h notice`,
  "portal.rules.rescheduling.unlimited": ({ hours }) => `No limit, with ${hours} h notice`,
  "portal.rules.empty.title": "The rules aren't published yet",
  "portal.rules.empty.description":
    "The organization hasn't saved the rules of this competition yet.",
  "competition.overview.viewPortal": "View public portal",
};

export const catalogs = { es, en } as const satisfies Record<Locale, Catalog>;
