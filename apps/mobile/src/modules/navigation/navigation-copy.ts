import type { WorkspaceContext, WorkspaceRole } from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import type { ContextLinkId, ContextTabId } from "./nav-registry";

const es = {
  tabs: {
    home: "Inicio",
    overview: "Resumen",
    fixture: "Calendario",
    standings: "Clasificación",
    more: "Más",
  },
  links: {
    bracket: "Bracket",
    rankings: "Rankings",
    teams: "Equipos",
    rules: "Reglamento",
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
} satisfies NavigationCopy;

const en = {
  tabs: {
    home: "Home",
    overview: "Overview",
    fixture: "Schedule",
    standings: "Standings",
    more: "More",
  },
  links: {
    bracket: "Bracket",
    rankings: "Rankings",
    teams: "Teams",
    rules: "Rules",
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
} satisfies NavigationCopy;

type NavigationCopy = {
  tabs: Record<ContextTabId, string>;
  links: Record<ContextLinkId, string>;
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
};

export function navigationCopy(language: MobileLanguage): NavigationCopy {
  return language === "es" ? es : en;
}
