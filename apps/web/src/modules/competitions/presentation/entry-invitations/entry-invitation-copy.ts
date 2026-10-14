import type { CompetitionsClientError } from "../competitions-browser-client.ts";

const ERROR_MESSAGES = new Map<string, string>([
  [
    "competitions.entry_invitation_pending_conflict",
    "Este jugador ya tiene una invitación pendiente a la competición.",
  ],
  ["competitions.entry_invitee_not_found", "Ese jugador ya no está disponible en Futrob."],
  ["competitions.not_editable", "La competición ya no admite equipos nuevos."],
  ["competitions.capacity_reached", "La competición ya alcanzó su cupo de equipos."],
  ["competitions.entry_invitation_not_found", "No encontramos esta invitación."],
  ["competitions.entry_invitation_revoked", "El organizador desactivó esta invitación."],
  ["competitions.entry_invitation_expired", "Esta invitación caducó. Pide una nueva."],
  ["competitions.entry_invitation_forbidden", "Esta invitación es para otro jugador."],
  ["competitions.entry_invitation_already_decided", "Esta invitación ya fue respondida."],
  ["teams.roster_competition_conflict", "Ya formas parte de un equipo en esta competición."],
  ["teams.invalid_name", "Escribe un nombre de equipo válido."],
  ["authorization.forbidden", "No tienes permiso para gestionar invitaciones."],
  ["api.rate_limited", "Demasiados intentos. Espera un momento y vuelve a intentarlo."],
]);

/** Spanish copy for a failed invitation request, by its stable wire code. */
export function entryInvitationErrorMessage(
  error: CompetitionsClientError | null,
  fallback: string,
): string {
  return (error === null ? undefined : ERROR_MESSAGES.get(error.code)) ?? fallback;
}

/** Text that precedes the link in a WhatsApp message. */
export function entryInvitationShareText(competitionName: string): string {
  return `Te invito a inscribir tu equipo en ${competitionName} en Futrob:`;
}
