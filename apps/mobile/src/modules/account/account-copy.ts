import type { AccountDeletionBlockerDto } from "@futrob/api-contracts";
import type { SessionDevice } from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";

const es = {
  title: "Cuenta",
  back: "Volver",
  retry: "Reintentar",
  preferences: "Preferencias",
  language: "Idioma",
  languageValue: "Español",
  languageSwitch: "Cambiar a English",
  languageHint: "Se aplica al elegirlo y se recuerda en este dispositivo.",
  security: "Seguridad",
  sessions: "Sesiones",
  deleteAccount: "Eliminar cuenta",
  email: "Correo",
  emailCurrent: (email: string) => `Entras con ${email}.`,
  emailNew: "Correo nuevo",
  emailHint:
    "Te enviaremos un enlace al correo nuevo. Hasta que lo abras, sigues entrando con el actual.",
  emailSubmit: "Cambiar correo",
  emailSent: (email: string) => `Enlace enviado a ${email}. Ábrelo para confirmar el cambio.`,
  emailInvalid: "Escribe un correo válido.",
  emailUnchanged: "Ese ya es tu correo.",
  emailUnavailable: "El cambio de correo aún no está disponible. Tu correo no cambió.",
  emailError: "No pudimos pedir el cambio de correo. Vuelve a intentarlo.",
  password: "Contraseña",
  passwordHint: "Al cambiarla se cierran tus otras sesiones.",
  currentPassword: "Contraseña actual",
  newPassword: "Nueva contraseña",
  confirmPassword: "Repetir nueva contraseña",
  passwordSubmit: "Cambiar contraseña",
  passwordChanged: "Contraseña cambiada. Cerramos tus otras sesiones.",
  passwordInvalid:
    "Completa la contraseña actual y usa una nueva de 8 a 128 caracteres. Ambas contraseñas nuevas deben coincidir.",
  passwordError:
    "No pudimos cambiar la contraseña. Revisa la contraseña actual e inténtalo de nuevo.",
  sessionsHint:
    "Dispositivos con tu cuenta abierta. Al cerrar una sesión deja de valer al momento.",
  sessionsLoading: "Cargando sesiones…",
  sessionsError: "No pudimos cargar tus sesiones.",
  sessionsOnlyThis: "Solo tienes abierta esta sesión.",
  sessionCurrent: "Esta sesión",
  sessionActivity: (signedIn: string, lastActive: string) =>
    `Inició el ${signedIn} · Última actividad: ${lastActive}`,
  sessionRevoke: "Cerrar sesión",
  sessionRevokeLabel: (device: string) => `Cerrar la sesión de ${device}`,
  sessionsRevokeOthers: "Cerrar las demás",
  sessionsRevokeError: "No pudimos cerrar la sesión. Vuelve a intentarlo.",
  deviceUnknown: "Dispositivo desconocido",
  deviceApp: "App de Futrob",
  deviceOn: (client: string, os: string) => `${client} en ${os}`,
  deleteIntro:
    "La cuenta se elimina 30 días después de pedirlo. Hasta entonces puedes cancelarlo iniciando sesión.",
  deleteRemovedTitle: "Qué se borra",
  deleteRemoved:
    "Tu nombre, correo, contraseña y sesiones; tus cuentas de juego y estadísticas personales; tus membresías en organizaciones y en plantillas de competiciones en curso.",
  deleteKeptTitle: "Qué se conserva",
  deleteKept:
    "Los resultados oficiales, las estadísticas de competición y la auditoría, sin tu nombre: aparecen como «Cuenta eliminada».",
  deleteLoading: "Comprobando si puedes eliminar la cuenta…",
  deleteStatusError: "No pudimos comprobar el estado de tu cuenta.",
  deleteBlockedTitle: "Antes de eliminar la cuenta",
  deleteBlocker: (blocker: AccountDeletionBlockerDto) =>
    blocker.kind === "sole-organizer"
      ? `Eres el único organizador de ${blocker.organizationName}. Da el rol de organizador a otra persona o archiva sus competiciones activas.`
      : `Eres capitán de ${blocker.teamName} en ${blocker.competitionName}. Cede la capitanía a otro jugador.`,
  deleteConfirmDescription: (date: string) =>
    `Cerraremos todas tus sesiones, también esta, y eliminaremos la cuenta el ${date}. Escribe tu contraseña para confirmar.`,
  deletePassword: "Contraseña",
  deleteConfirm: "Eliminar mi cuenta",
  deleteWrongPassword: "La contraseña no coincide. La cuenta sigue activa.",
  deleteBlocked: "Hay responsabilidades pendientes. Revísalas arriba.",
  deleteError: "No pudimos programar la eliminación. La cuenta sigue activa.",
  scheduledTitle: (date: string) => `Tu cuenta se eliminará el ${date}`,
  scheduledBody:
    "Pediste eliminar tu cuenta. Hasta esa fecha puedes cancelarlo y todo quedará como estaba.",
  cancelDeletion: "Cancelar eliminación",
  cancelError: "No pudimos cancelar la eliminación. Vuelve a intentarlo.",
  signOut: "Cerrar sesión",
};

export type AccountCopy = typeof es;

const en: AccountCopy = {
  title: "Account",
  back: "Back",
  retry: "Try again",
  preferences: "Preferences",
  language: "Language",
  languageValue: "English",
  languageSwitch: "Cambiar a Español",
  languageHint: "Applied when you choose it and remembered on this device.",
  security: "Security",
  sessions: "Sessions",
  deleteAccount: "Delete account",
  email: "Email",
  emailCurrent: (email) => `You sign in with ${email}.`,
  emailNew: "New email",
  emailHint:
    "We will send a link to the new address. Until you open it, you keep signing in with the current one.",
  emailSubmit: "Change email",
  emailSent: (email) => `Link sent to ${email}. Open it to confirm the change.`,
  emailInvalid: "Enter a valid email.",
  emailUnchanged: "That is already your email.",
  emailUnavailable: "Changing email is not available yet. Your email did not change.",
  emailError: "We could not request the email change. Try again.",
  password: "Password",
  passwordHint: "Changing it signs out your other sessions.",
  currentPassword: "Current password",
  newPassword: "New password",
  confirmPassword: "Repeat new password",
  passwordSubmit: "Change password",
  passwordChanged: "Password changed. We signed out your other sessions.",
  passwordInvalid:
    "Enter your current password and a new password of 8 to 128 characters. Both new passwords must match.",
  passwordError: "We could not change your password. Check your current password and try again.",
  sessionsHint: "Devices where your account is open. Signing a session out ends it immediately.",
  sessionsLoading: "Loading sessions…",
  sessionsError: "We could not load your sessions.",
  sessionsOnlyThis: "Only this session is open.",
  sessionCurrent: "This session",
  sessionActivity: (signedIn, lastActive) => `Signed in ${signedIn} · Last active ${lastActive}`,
  sessionRevoke: "Sign out",
  sessionRevokeLabel: (device) => `Sign out ${device}`,
  sessionsRevokeOthers: "Sign out the others",
  sessionsRevokeError: "We could not sign that session out. Try again.",
  deviceUnknown: "Unknown device",
  deviceApp: "Futrob app",
  deviceOn: (client, os) => `${client} on ${os}`,
  deleteIntro:
    "Your account is deleted 30 days after you ask. Until then you can cancel by signing in.",
  deleteRemovedTitle: "What is deleted",
  deleteRemoved:
    "Your name, email, password and sessions; your game accounts and personal statistics; your memberships in organizations and in rosters of running competitions.",
  deleteKeptTitle: "What is kept",
  deleteKept:
    "Official results, competition statistics and the audit trail, without your name: they show “Deleted account”.",
  deleteLoading: "Checking whether you can delete the account…",
  deleteStatusError: "We could not check your account status.",
  deleteBlockedTitle: "Before you delete the account",
  deleteBlocker: (blocker) =>
    blocker.kind === "sole-organizer"
      ? `You are the only organizer of ${blocker.organizationName}. Give the organizer role to someone else or archive its active competitions.`
      : `You captain ${blocker.teamName} in ${blocker.competitionName}. Hand the captaincy to another player.`,
  deleteConfirmDescription: (date) =>
    `We will sign out every session, this one included, and delete the account on ${date}. Enter your password to confirm.`,
  deletePassword: "Password",
  deleteConfirm: "Delete my account",
  deleteWrongPassword: "The password does not match. Your account is still active.",
  deleteBlocked: "There are open responsibilities. Review them above.",
  deleteError: "We could not schedule the deletion. Your account is still active.",
  scheduledTitle: (date) => `Your account will be deleted on ${date}`,
  scheduledBody:
    "You asked to delete your account. Until that date you can cancel and everything stays as it was.",
  cancelDeletion: "Cancel deletion",
  cancelError: "We could not cancel the deletion. Try again.",
  signOut: "Sign out",
};

export function accountCopy(language: MobileLanguage): AccountCopy {
  return language === "es" ? es : en;
}

export function deviceName(device: SessionDevice, copy: AccountCopy): string {
  if (device.kind === "app") return copy.deviceApp;
  if (device.client && device.os) return copy.deviceOn(device.client, device.os);
  return device.client ?? device.os ?? copy.deviceUnknown;
}
