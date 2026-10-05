import type { CompetitionDto } from "@futrob/api-contracts";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";

const es = {
  title: "Inicio",
  loading: "Cargando tu actividad…",
  updating: "Actualizando…",
  activity: (club: string) => `Tu actividad con ${club}`,
  loadFailedTitle: "No pudimos cargar tu inicio",
  loadFailedDescription: "Comprueba la conexión e inténtalo de nuevo.",
  sectionFailed: "No se pudo cargar",
  retry: "Reintentar",
  retrySection: (section: string) => `Reintentar ${section}`,
  refreshMatches: "Actualizar partidos",
  club: "Club",
  selectClubTitle: "Selecciona un club",
  selectClubDescription: "Elige tu club para ver actividad, partidos y competiciones.",
  invalidClubTitle: "Ese club no está asociado a tu perfil",
  invalidClubDescription: "Elige uno de tus clubes para continuar.",
  onboardingTitle: "Empieza con tus datos de juego",
  onboardingDescription: "Selecciona tu club de EA Clubs y registra tu identificador.",
  nextTitle: "Tu próximo enfrentamiento",
  round: (competition: string, round: number) => `${competition} · Jornada ${round}`,
  vs: "VS",
  pending: "Pendiente de jugar",
  viewCompetition: "Ver competición",
  noUpcomingTitle: "Sin enfrentamientos programados",
  noUpcomingDescription:
    "Tu club ya está en competiciones. Todavía no hay fecha para el próximo enfrentamiento.",
  noCompetitionsTitle: "Da el salto a la competición",
  noCompetitionsDescription: "Tu equipo aún no participa en torneos de Futrob.",
  invitationsTitle: "Invitaciones",
  pendingInvitations: (count: number) =>
    count === 1 ? "1 invitación por responder" : `${count} invitaciones por responder`,
  noInvitations: "Sin invitaciones pendientes",
  eaTitle: "Identificador de juego",
  eaLinked: "Registrado en EA Clubs.",
  eaUnlinked: "Sin identificador de juego",
  performanceTitle: "Rendimiento",
  matches: "Partidos",
  wins: "Victorias",
  rating: "Rating",
  goalsAssists: "Goles + asistencias",
  statsEmpty: "Tus estadísticas aparecerán cuando tengas partidos registrados.",
  statsUnavailable: "Rendimiento personal no disponible",
  lastMatchTitle: "Último partido",
  finished: "Finalizado",
  didNotPlay: "No jugaste",
  lastMatchEmptyTitle: "Todavía no hay partidos registrados",
  lastMatchEmptyDescription: "No hay apariciones tuyas en el club seleccionado.",
  lastMatchLocked: "Aún no podemos identificar tu actuación en los partidos.",
  competitionsTitle: "Mis competiciones",
  competitionsEmpty: "Sin competiciones por ahora",
  format: {
    league: "Liga",
    knockout: "Eliminatoria",
    "groups-knockout": "Grupos y eliminatoria",
    "league-playoffs": "Liga y playoffs",
  },
  status: {
    draft: "Inscrito",
    registration: "Inscripciones abiertas",
    published: "En curso",
    paused: "Pausada",
    finished: "Finalizada",
    archived: "Archivada",
  },
} satisfies PlayerHomeCopy;

const en = {
  title: "Home",
  loading: "Loading your activity…",
  updating: "Updating…",
  activity: (club: string) => `Your activity with ${club}`,
  loadFailedTitle: "We couldn't load your home",
  loadFailedDescription: "Check your connection and try again.",
  sectionFailed: "Unable to load",
  retry: "Try again",
  retrySection: (section: string) => `Try again: ${section}`,
  refreshMatches: "Refresh matches",
  club: "Club",
  selectClubTitle: "Select a club",
  selectClubDescription: "Choose your club to see activity, matches and competitions.",
  invalidClubTitle: "That club is not linked to your profile",
  invalidClubDescription: "Choose one of your clubs to continue.",
  onboardingTitle: "Start with your game data",
  onboardingDescription: "Select your EA Clubs club and register your identifier.",
  nextTitle: "Your next fixture",
  round: (competition: string, round: number) => `${competition} · Matchday ${round}`,
  vs: "VS",
  pending: "Not played yet",
  viewCompetition: "View competition",
  noUpcomingTitle: "No fixtures scheduled",
  noUpcomingDescription: "Your club is in competitions. The next fixture has no date yet.",
  noCompetitionsTitle: "Step into competition",
  noCompetitionsDescription: "Your team is not in a Futrob tournament yet.",
  invitationsTitle: "Invitations",
  pendingInvitations: (count: number) =>
    count === 1 ? "1 invitation to answer" : `${count} invitations to answer`,
  noInvitations: "No pending invitations",
  eaTitle: "Game identifier",
  eaLinked: "Registered with EA Clubs.",
  eaUnlinked: "No game identifier",
  performanceTitle: "Performance",
  matches: "Matches",
  wins: "Wins",
  rating: "Rating",
  goalsAssists: "Goals + assists",
  statsEmpty: "Your statistics will appear when you have recorded matches.",
  statsUnavailable: "Personal performance unavailable",
  lastMatchTitle: "Last match",
  finished: "Finished",
  didNotPlay: "You did not play",
  lastMatchEmptyTitle: "No matches recorded yet",
  lastMatchEmptyDescription: "You have no appearances in the selected club.",
  lastMatchLocked: "We cannot identify your performance in matches yet.",
  competitionsTitle: "My competitions",
  competitionsEmpty: "No competitions yet",
  format: {
    league: "League",
    knockout: "Knockout",
    "groups-knockout": "Groups and knockout",
    "league-playoffs": "League and playoffs",
  },
  status: {
    draft: "Registered",
    registration: "Registration open",
    published: "In progress",
    paused: "Paused",
    finished: "Finished",
    archived: "Archived",
  },
} satisfies PlayerHomeCopy;

type PlayerHomeCopy = {
  [key: string]: string | ((...args: never[]) => string) | Record<string, string>;
  format: Record<CompetitionDto["format"], string>;
  status: Record<CompetitionDto["status"], string>;
};

export function playerHomeCopy(language: MobileLanguage) {
  return language === "es" ? es : en;
}

/** Kick-off in the competition's own time zone, as the web home shows it. */
export function formatEncounterWhen(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatMatchDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(iso));
}
