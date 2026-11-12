import type { WorkspaceContext, WorkspaceRole } from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import type { ContextTabId, MoreDestinationId } from "./nav-registry";

const es = {
  tabs: {
    home: "Inicio",
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
    teams: ["Mis equipos", "Tus plantillas y tu equipo activo"],
    activity: ["Actividad", "Invitaciones, selecciones y decisiones recientes"],
    team: ["Mi equipo", "Plantilla e invitaciones de tu equipo"],
    members: ["Miembros", "Quién opera la organización e invitaciones"],
    settings: ["Ajustes", "Nombre y dirección de la organización"],
  },
} satisfies NavigationCopy;

const en = {
  tabs: {
    home: "Home",
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
    teams: ["My teams", "Your rosters and your active team"],
    activity: ["Activity", "Recent invitations, selections and decisions"],
    team: ["My team", "Your team's roster and invitations"],
    members: ["Members", "Who runs the organization, and invitations"],
    settings: ["Settings", "The organization's name and address"],
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
