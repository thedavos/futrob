import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

const LANGUAGE_KEY = "futrob.mobile.language";
export type MobileLanguage = "es" | "en";

const messages = {
  es: {
    retry: "Reintentar",
    back: "Atrás",
    continue: "Continuar",
    skip: "Omitir",
    confirm: "Confirmar",
    intention: "¿Cómo quieres empezar?",
    organization: "Organización",
    competition: "Primera competición",
    invitation: "Invitación",
    account: "Cuenta de juego",
    club: "Club EA",
    review: "Revisa tus datos",
    playerPath: "Continuar como jugador",
    organizationPath: "Crear una organización",
    invitationPath: "Aceptar invitación",
    orgName: "Nombre de la organización",
    competitionName: "Nombre de la competición",
    edition: "Edición (p. ej. FC 26)",
    platform: "Plataforma",
    region: "Región",
    timezone: "Zona horaria",
    format: "Formato",
    identifier: "Identificador de juego",
    optionalAccount: "La cuenta de juego es opcional.",
    invitationToken: "Código de invitación",
    inspect: "Comprobar invitación",
    expires: "Caduca",
    clubSearch: "Buscar club EA",
    search: "Buscar",
    noClubs: "No encontramos clubes para esa búsqueda.",
    organizationTaken: "Ese nombre no está disponible.",
    required: "Completa los campos requeridos.",
    incompleteAccount: "Completa los tres datos de cuenta o déjalos vacíos.",
    selectClub: "Seleccionar",
    removeClub: "Quitar club",
    selected: "Seleccionado",
    noSession: "Tu sesión terminó. Inicia sesión de nuevo.",
    genericError: "No se pudo completar. Intenta de nuevo.",
    networkError: "Comprueba tu conexión e inténtalo de nuevo.",
    rateLimit: "Demasiados intentos. Espera antes de continuar.",
    invalidInvitation: "La invitación no es válida o ya no está disponible.",
    edit: "Editar",
    language: "English",
    saved: "Tus datos se guardan en este dispositivo.",
    loginTitle: "Bienvenido de nuevo",
    loginSubtitle: "Ingresa a tu cuenta para gestionar tus competiciones.",
    signupTitle: "Crear una cuenta",
    signupSubtitle: "Únete para organizar competiciones o jugar con tu equipo.",
    email: "Correo electrónico",
    password: "Contraseña",
    name: "Nombre",
    emailPlaceholder: "ejemplo@correo.com",
    passwordPlaceholder: "Ingresa tu contraseña",
    newPasswordPlaceholder: "Crea una contraseña",
    namePlaceholder: "Tu nombre",
    login: "Iniciar sesión",
    signup: "Crear cuenta",
    noAccount: "¿Aún no tienes cuenta?",
    hasAccount: "¿Ya tienes cuenta?",
    gateErrorTitle: "No pudimos comprobar tu acceso",
    gateErrorDescription: "Comprueba la conexión e inténtalo de nuevo.",
    invitationLoading: "Abriendo invitación…",
    invitationErrorTitle: "No pudimos abrir la invitación",
    invitationErrorDescription: "Comprueba el enlace e inténtalo de nuevo.",
    wait: "Espera",
  },
  en: {
    retry: "Retry",
    back: "Back",
    continue: "Continue",
    skip: "Skip",
    confirm: "Confirm",
    intention: "How would you like to start?",
    organization: "Organization",
    competition: "First competition",
    invitation: "Invitation",
    account: "Game account",
    club: "EA club",
    review: "Review your details",
    playerPath: "Continue as a player",
    organizationPath: "Create an organization",
    invitationPath: "Accept invitation",
    orgName: "Organization name",
    competitionName: "Competition name",
    edition: "Edition (e.g. FC 26)",
    platform: "Platform",
    region: "Region",
    timezone: "Time zone",
    format: "Format",
    identifier: "Game identifier",
    optionalAccount: "A game account is optional.",
    invitationToken: "Invitation code",
    inspect: "Check invitation",
    expires: "Expires",
    clubSearch: "Search EA clubs",
    search: "Search",
    noClubs: "No clubs matched your search.",
    organizationTaken: "That name is unavailable.",
    required: "Complete the required fields.",
    incompleteAccount: "Complete all three account fields or leave them empty.",
    selectClub: "Select",
    removeClub: "Remove club",
    selected: "Selected",
    noSession: "Your session ended. Sign in again.",
    genericError: "We couldn't finish. Please try again.",
    networkError: "Check your connection and try again.",
    rateLimit: "Too many attempts. Wait before continuing.",
    invalidInvitation: "The invitation is invalid or no longer available.",
    edit: "Edit",
    language: "Español",
    saved: "Your details are saved on this device.",
    loginTitle: "Welcome back",
    loginSubtitle: "Sign in to manage your competitions.",
    signupTitle: "Create an account",
    signupSubtitle: "Join to organize competitions or play with your team.",
    email: "Email",
    password: "Password",
    name: "Name",
    emailPlaceholder: "name@example.com",
    passwordPlaceholder: "Enter your password",
    newPasswordPlaceholder: "Create a password",
    namePlaceholder: "Your name",
    login: "Sign in",
    signup: "Create account",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    gateErrorTitle: "We couldn't verify your access",
    gateErrorDescription: "Check your connection and try again.",
    invitationLoading: "Opening invitation…",
    invitationErrorTitle: "We couldn't open the invitation",
    invitationErrorDescription: "Check the link and try again.",
    wait: "Wait",
  },
} as const;

export type MobileCopyKey = keyof typeof messages.es;

const AUTH_ENGLISH_ERRORS = {
  "Este campo es obligatorio.": "This field is required.",
  "Ingresa un correo electrónico válido.": "Enter a valid email address.",
  "Mínimo 8 caracteres, incluyendo letras y números.":
    "At least 8 characters, including letters and numbers.",
  "Usa al menos 8 caracteres.": "Use at least 8 characters.",
  "Incluye al menos una letra.": "Include at least one letter.",
  "Incluye al menos un número.": "Include at least one number.",
  "El correo o la contraseña no son correctos.": "The email or password is incorrect.",
  "Ya existe una cuenta con este correo.": "An account with this email already exists.",
  "No se pudo conectar. Revisa tu conexión e intenta de nuevo.":
    "Couldn't connect. Check your connection and try again.",
  "No se pudo completar. Intenta de nuevo.": "Couldn't complete the request. Try again.",
} as const;

export function localizeAuthMessage(
  message: string | null | undefined,
  language: MobileLanguage,
): string | null {
  if (!message) return null;
  return language === "en"
    ? (Object.entries(AUTH_ENGLISH_ERRORS).find(([source]) => source === message)?.[1] ?? message)
    : message;
}

export function useMobileCopy() {
  const [language, setLanguage] = useState<MobileLanguage>("es");
  useEffect(() => {
    void SecureStore.getItemAsync(LANGUAGE_KEY).then((saved) => {
      if (saved === "es" || saved === "en") setLanguage(saved);
    });
  }, []);
  function toggleLanguage() {
    const next = language === "es" ? "en" : "es";
    setLanguage(next);
    void SecureStore.setItemAsync(LANGUAGE_KEY, next);
  }
  return { language, t: (key: MobileCopyKey) => messages[language][key], toggleLanguage };
}
