import type { OrganizationsClientError } from "@/modules/organizations/presentation/organizations-browser-client.ts";

export function invitationAcceptErrorMessage(error: OrganizationsClientError | null): string {
  if (!error) {
    return "No se pudo aceptar la invitación. Inténtalo de nuevo.";
  }

  switch (error.code) {
    case "organizations.invitation_not_found":
      return "No encontramos esa invitación.";
    case "organizations.invitation_expired":
      return "La invitación ha caducado.";
    case "organizations.invitation_revoked":
      return "La invitación fue revocada.";
    case "organizations.invitation_exhausted":
      return "Esta invitación ya alcanzó el número máximo de usos.";
    case "organizations.invitation_invalid":
      return "La invitación ya no es válida.";
    default:
      return "No se pudo aceptar la invitación. Inténtalo de nuevo.";
  }
}
