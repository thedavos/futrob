import type { OnboardingPathDto } from "@futrob/api-contracts";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";

/** Maps finish failures to safe Spanish copy for the onboarding review step. */
export function finalizationError(path: OnboardingPathDto, caught: unknown): string {
  if (caught instanceof IdentityOnboardingClientError && path === "invitation") {
    switch (caught.code) {
      case "organizations.invitation_not_found":
        return "No encontramos esa invitación. Revisa el código e inténtalo nuevamente.";
      case "organizations.invitation_expired":
        return "La invitación ha caducado. Solicita una nueva al organizador.";
      case "organizations.invitation_revoked":
        return "La invitación fue revocada. Solicita una nueva al organizador.";
      case "organizations.invitation_invalid":
        return "La invitación ya no está disponible.";
    }
  }
  if (caught instanceof IdentityOnboardingClientError && path === "organization") {
    if (caught.code === "organizations.name_conflict") {
      return "Ese nombre de organización ya está en uso. Vuelve y elige otro.";
    }
    if (caught.code.startsWith("competitions.invalid_")) {
      return "Los datos de la competición no son válidos. Revísalos e inténtalo nuevamente.";
    }
    if (caught.code.startsWith("teams.invalid_")) {
      return "Los datos de la cuenta de juego no son válidos. Revísalos e inténtalo nuevamente.";
    }
    return caught.code === "organizations.invalid_name"
      ? "El nombre de la organización no es válido."
      : "No pudimos crear la organización. Inténtalo nuevamente.";
  }
  if (caught instanceof IdentityOnboardingClientError && caught.code.startsWith("teams.invalid_")) {
    return "Los datos de la cuenta de juego no son válidos. Revísalos e inténtalo nuevamente.";
  }
  if (caught instanceof IdentityOnboardingClientError && path === "player") {
    return "No pudimos guardar tu perfil de jugador. Inténtalo nuevamente.";
  }
  return "No pudimos finalizar tu configuración. Inténtalo nuevamente.";
}
