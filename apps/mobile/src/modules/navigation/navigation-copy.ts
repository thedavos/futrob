import type { WorkspaceContext, WorkspaceRole } from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import type { ContextTabId, MoreDestinationId } from "./nav-registry";

const es = {
  tabs: {
    home: "Inicio",
    matches: "Partidos",
    statistics: "Estadísticas",
    competitions: "Competiciones",
    overview: "Resumen",
    more: "Más",
  },
  tabBar: "Navegación",
  context: {
    personal: "Espacio personal",
    organization: "Organización",
    competition: "Competición",
  },
  switchContext: (current: string) => `Cambiar de contexto. Actual: ${current}`,
  selectorTitle: "Cambiar de contexto",
  close: "Cerrar",
  groups: {
    competitions: "Competiciones",
    clubs: "Clubes EA",
    organizations: "Organizaciones",
  },
  empty: {
    competitions: "Sin competiciones todavía",
    clubs: "Sin clubes todavía",
    organizations: "Sin organizaciones todavía",
  },
  roles: {
    organizer: "Organizador",
    staff: "Staff",
    member: "Miembro",
    captain: "Capitán",
    vice_captain: "Subcapitán",
    player: "Jugador",
  },
  optionsLoading: "Cargando tus espacios…",
  optionsErrorTitle: "No pudimos cargar tus espacios",
  optionsErrorDescription: "Comprueba la conexión e inténtalo de nuevo.",
  retry: "Reintentar",
  more: {
    title: "Más",
    account: "Cuenta",
    accountDescription: "Perfil, seguridad y sesiones",
    languageDescription: "Idioma de la app",
    signOut: "Cerrar sesión",
  },
  destinations: {
    "ea-clubs": ["Clubes EA", "Elige o añade el club de tus partidos"],
    "game-accounts": ["Cuentas de juego", "Tu identificador de EA"],
    explore: ["Explorar competiciones", "Torneos con inscripciones o en curso"],
  },
} satisfies NavigationCopy;

const en = {
  tabs: {
    home: "Home",
    matches: "Matches",
    statistics: "Statistics",
    competitions: "Competitions",
    overview: "Overview",
    more: "More",
  },
  tabBar: "Navigation",
  context: {
    personal: "Personal space",
    organization: "Organization",
    competition: "Competition",
  },
  switchContext: (current: string) => `Switch context. Current: ${current}`,
  selectorTitle: "Switch context",
  close: "Close",
  groups: {
    competitions: "Competitions",
    clubs: "EA Clubs",
    organizations: "Organizations",
  },
  empty: {
    competitions: "No competitions yet",
    clubs: "No clubs yet",
    organizations: "No organizations yet",
  },
  roles: {
    organizer: "Organizer",
    staff: "Staff",
    member: "Member",
    captain: "Captain",
    vice_captain: "Vice captain",
    player: "Player",
  },
  optionsLoading: "Loading your spaces…",
  optionsErrorTitle: "We couldn't load your spaces",
  optionsErrorDescription: "Check your connection and try again.",
  retry: "Try again",
  more: {
    title: "More",
    account: "Account",
    accountDescription: "Profile, security and sessions",
    languageDescription: "App language",
    signOut: "Sign out",
  },
  destinations: {
    "ea-clubs": ["EA Clubs", "Choose or add the club behind your matches"],
    "game-accounts": ["Game accounts", "Your EA identifier"],
    explore: ["Explore competitions", "Tournaments open for entries or in progress"],
  },
} satisfies NavigationCopy;

type NavigationCopy = {
  tabs: Record<ContextTabId, string>;
  tabBar: string;
  context: Record<WorkspaceContext["kind"], string>;
  switchContext: (current: string) => string;
  selectorTitle: string;
  close: string;
  groups: Record<"competitions" | "clubs" | "organizations", string>;
  empty: Record<"competitions" | "clubs" | "organizations", string>;
  roles: Record<WorkspaceRole, string>;
  optionsLoading: string;
  optionsErrorTitle: string;
  optionsErrorDescription: string;
  retry: string;
  more: Record<
    "title" | "account" | "accountDescription" | "languageDescription" | "signOut",
    string
  >;
  /** Title and description of each «Más» destination. */
  destinations: Record<MoreDestinationId, readonly [title: string, description: string]>;
};

export function navigationCopy(language: MobileLanguage): NavigationCopy {
  return language === "es" ? es : en;
}
