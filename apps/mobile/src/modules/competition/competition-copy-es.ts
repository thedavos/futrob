import type { FixtureRoundName } from "@futrob/sdk";
import type { CompetitionCopy } from "./competition-copy";

function spanishOrdinal(rank: number): string {
  return `${rank}.º`;
}

const esStage = {
  league: "Liga",
  groups: "Grupos",
  knockout: "Eliminación",
  playoffs: "Playoffs",
  swiss: "Fase suiza",
} as const;

function esRound(name: FixtureRoundName): string {
  switch (name.kind) {
    case "matchday":
      return `Jornada ${name.number}`;
    case "final":
      return "Final";
    case "semifinal":
      return "Semifinales";
    case "quarterfinal":
      return "Cuartos de final";
    case "roundOf16":
      return "Octavos de final";
    case "round":
      return `Ronda ${name.number}`;
  }
}

function esWinner(from: { round: FixtureRoundName; order: number }): string {
  switch (from.round.kind) {
    case "final":
      return "Ganador de la final";
    case "semifinal":
      return `Ganador de la semifinal ${from.order}`;
    case "quarterfinal":
      return `Ganador de cuartos ${from.order}`;
    case "roundOf16":
      return `Ganador de octavos ${from.order}`;
    case "matchday":
      return `Ganador de la jornada ${from.round.number}, cruce ${from.order}`;
    case "round":
      return `Ganador de la ronda ${from.round.number}, cruce ${from.order}`;
  }
}

export const es: CompetitionCopy = {
  back: "Atrás",
  retry: "Reintentar",
  forbidden: {
    title: "No tienes acceso",
    description: "Tu rol en esta competición no permite ver esta sección.",
  },
  notFound: {
    title: "Competición no disponible",
    description: "No existe o ya no forma parte de tus espacios.",
  },
  accessError: "No pudimos comprobar tu acceso.",
  stage: esStage,
  round: esRound,
  ordinal: spanishOrdinal,
  side: (side) => {
    switch (side.kind) {
      case "team":
        return side.name ?? "Equipo no disponible";
      case "bye":
        return "Descansa";
      case "winner":
        return side.from ? esWinner(side.from) : "Ganador por definir";
      case "groupRank":
        return `${spanishOrdinal(side.rank)} del grupo ${side.group}`;
      case "stageRank":
        return `${spanishOrdinal(side.rank)} de ${esStage[side.stage]}`;
    }
  },
  fixture: {
    title: "Calendario",
    loading: "Cargando el calendario",
    error: "No pudimos cargar el calendario.",
    refreshError: "No pudimos actualizar el calendario. Ves la última lectura correcta.",
    emptyTitle: "Aún no hay calendario",
    emptyDescription: "Cuando se genere el fixture, verás aquí cada etapa y sus rondas.",
    timeZone: (zone) => `Horarios en ${zone}`,
    bye: (team) => `${team} descansa`,
    closed: "No disputado",
    withdrawn: "Retirado",
    group: (group) => `Grupo ${group}`,
    slots: (count) => (count === 1 ? "1 partido" : `${count} partidos`),
    roundPending: "Se empareja cuando se oficialice la ronda anterior",
    matchup: (home, away) => `${home} vs ${away}`,
  },
  bracket: {
    title: "Bracket",
    loading: "Cargando el cuadro",
    error: "No pudimos cargar el cuadro.",
    refreshError: "No pudimos actualizar el cuadro. Ves la última lectura correcta.",
    emptyTitle: "Aún no hay cuadro",
    emptyDescription: "Cuando se genere el fixture, verás aquí las eliminatorias.",
    noBracketTitle: "Esta competición no tiene eliminatorias",
    noBracketDescription: "Su formato se juega por tabla. Consulta el calendario.",
    calendarLink: "Ver calendario",
    twoLegs: "Ida y vuelta",
  },
  standings: {
    title: "Clasificación",
    loading: "Cargando la clasificación",
    error: "No pudimos cargar la clasificación.",
    refreshError: "No pudimos actualizar la clasificación. Ves la última lectura correcta.",
    emptyTitle: "Aún no hay clasificación oficial",
    emptyDescription: "Aparecerá cuando se apruebe el primer resultado oficial.",
    forbiddenTitle: "No tienes acceso a la clasificación",
    forbiddenDescription: "Tu rol en esta competición no permite ver sus estadísticas.",
    teamUnresolved: "Equipo sin nombre disponible",
    updated: (time) => `Actualizada ${time}`,
    playoffCut: (count) =>
      count === 1 ? "El primero pasa a playoffs" : `Los ${count} primeros pasan a playoffs`,
    columns: { played: "PJ", goalDifference: "DG", points: "Pts" },
    row: ({ position, team, played, goalDifference, points }) =>
      `${position}.º ${team}: ${points} puntos, ${played} partidos jugados, diferencia de goles ${goalDifference}`,
    swissRound: (current, total) => `Ronda ${current} de ${total}`,
    swissBetween: (completed, total) => `Rondas oficiales: ${completed} de ${total}`,
    swissFinal: "Clasificación final",
    withdrawn: "Retirado",
  },
  rankings: {
    title: "Rankings",
    loading: "Cargando rankings…",
    error: "No pudimos cargar los rankings.",
    refreshError: "No pudimos actualizar los rankings. Ves la última lectura correcta.",
    kinds: "Tipo de ranking",
    kind: {
      scorer: "Goleadores",
      assister: "Asistencias",
      rating: "Rating",
      mvp: "MVP",
      goalkeeper: "Porteros",
    },
    metric: {
      scorer: "Goles",
      assister: "Asistencias",
      rating: "Rating medio",
      mvp: "Premios MVP",
      goalkeeper: "Paradas",
    },
    criterion: {
      scorer: "Más goles en partidos oficiales aprobados.",
      assister: "Más asistencias en partidos oficiales aprobados.",
      rating: "Mejor rating medio en partidos oficiales aprobados.",
      mvp: "Más premios MVP en partidos oficiales aprobados.",
      goalkeeper: "Más paradas en partidos oficiales aprobados.",
    },
    notComputedTitle: "Aún no hay rankings",
    notComputedDescription: "Se calculan cuando se aprueban resultados oficiales.",
    emptyTitle: "Nadie entra todavía en este ranking",
    emptyDescription: "Ningún jugador cumple aún los mínimos de partidos y minutos.",
    forbiddenTitle: "No tienes acceso a los rankings",
    forbiddenDescription: "Tu rol en esta competición no permite ver sus estadísticas.",
    playerUnnamed: "Jugador sin nombre visible",
    teamNone: "Sin equipo",
    teamUnnamed: "Equipo sin nombre visible",
    namesLoading: "Cargando nombre",
    namesError: "No pudimos cargar los nombres de jugadores y equipos.",
    namesRestricted: "Algunos nombres no se muestran porque no puedes ver esas plantillas.",
    matches: (count) => (count === 1 ? "1 partido" : `${count} partidos`),
  },
  teams: {
    title: "Equipos",
    loading: "Cargando equipos",
    error: "No pudimos cargar los equipos.",
    refreshError: "No pudimos actualizar los equipos. Ves la última lectura correcta.",
    emptyTitle: "Aún no hay equipos",
    emptyDescription: "Los equipos aparecerán cuando se inscriban en la competición.",
    loadMore: "Cargar más equipos",
    members: (count, max) => `${count} de ${max} jugadores`,
    rosterOpen: "Plantilla abierta",
    rosterClosed: "Plantilla cerrada",
    club: (name) => `Club EA: ${name}`,
    noClub: "Sin club EA vinculado",
    roster: "Plantilla",
    emptyRoster: "Esta plantilla aún no tiene jugadores.",
    role: { captain: "Capitán", vice_captain: "Subcapitán", player: "Jugador" },
    entry: {
      pending: "Inscripción pendiente",
      approved: "Inscripción aprobada",
      rejected: "Inscripción rechazada",
      withdrawn: "Inscripción retirada",
    },
  },
  rules: {
    title: "Reglamento",
    loading: "Cargando el reglamento…",
    error: "No pudimos cargar el reglamento.",
    refreshError: "No pudimos actualizar el reglamento. Ves la última lectura correcta.",
    status: {
      draft: "Borrador",
      registration: "Inscripciones abiertas",
      published: "Publicada",
      paused: "En pausa",
      finished: "Finalizada",
      archived: "Archivada",
    },
    noticeDraft: "Borrador: estas reglas aún pueden cambiar antes de publicar.",
    noticeLocked: "Estas reglas quedaron fijadas al publicar la competición.",
    formatTitle: "Formato",
    formatLabel: "Tipo de competición",
    format: {
      league: "Liga",
      knockout: "Eliminación directa",
      "groups-knockout": "Grupos + eliminación",
      "league-playoffs": "Liga + playoffs",
      swiss: "Sistema suizo",
    },
    teams: "Equipos",
    teamsRange: (min, max) => (max === null ? `Desde ${min}` : `De ${min} a ${max}`),
    scoring: "Puntuación",
    win: "Victoria",
    draw: "Empate",
    loss: "Derrota",
    encounter: "Enfrentamiento",
    matchesPerEncounter: "Partidos por cruce",
    matches: (count) => (count === 1 ? "1 partido" : `${count} partidos`),
    resolution: "Resolución",
    aggregate: "Marcador agregado",
    independent: "Cada partido cuenta por separado",
    reschedule: "Reprogramación",
    rescheduleNotAllowed: "No se permiten reprogramaciones",
    rescheduleMax: "Máximo por equipo",
    unlimited: "Sin límite",
    rescheduleNotice: "Aviso mínimo",
    rescheduleExpiry: "Plazo de respuesta a una propuesta",
    hours: (count) => (count === 1 ? "1 hora" : `${count} horas`),
    opponentApproval: "Aprobación del rival",
    organizerApproval: "Aprobación del organizador",
    required: "Obligatoria",
    notRequired: "No requerida",
    rosterTitle: "Plantilla",
    rosterMax: "Máximo de jugadores",
    rosterDefault: "Tope por defecto",
    players: (count) => (count === 1 ? "1 jugador" : `${count} jugadores`),
    tiebreaksTitle: "Criterios de desempate",
    tiebreaksDescription: "Se aplican en este orden.",
    tiebreak: {
      points: "Puntos",
      buchholz: "Buchholz",
      goalDifference: "Diferencia de goles",
      goalsFor: "Goles a favor",
    },
  },
};
