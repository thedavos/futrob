import type { OnboardingPathDto } from "@futrob/api-contracts";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import type { SupportError } from "@/shared/presentation/support-error-alert.tsx";

export function finalizationError(path: OnboardingPathDto, caught: unknown): SupportError {
  const requestId = caught instanceof IdentityOnboardingClientError ? caught.requestId : undefined;
  const retryAfterSeconds =
    caught instanceof IdentityOnboardingClientError ? caught.retryAfterSeconds : undefined;
  const present = (message: string): SupportError => ({
    message,
    ...(requestId ? { requestId } : {}),
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  });

  if (caught instanceof IdentityOnboardingClientError && caught.code === "api.rate_limited") {
    return present("Alcanzaste el límite temporal. Espera antes de intentarlo nuevamente.");
  }

  if (caught instanceof IdentityOnboardingClientError && path === "invitation") {
    switch (caught.code) {
      case "organizations.invitation_not_found":
        return present("No encontramos esa invitación. Revisa el código e inténtalo nuevamente.");
      case "organizations.invitation_expired":
        return present("La invitación ha caducado. Solicita una nueva al organizador.");
      case "organizations.invitation_revoked":
        return present("La invitación fue revocada. Solicita una nueva al organizador.");
      case "organizations.invitation_invalid":
        return present("La invitación ya no está disponible.");
    }
  }
  if (caught instanceof IdentityOnboardingClientError && path === "organization") {
    if (caught.code === "organizations.name_conflict") {
      return present("Ese nombre de organización ya está en uso. Vuelve y elige otro.");
    }
    if (caught.code.startsWith("competitions.invalid_")) {
      return present(
        "Los datos de la competición no son válidos. Revísalos e inténtalo nuevamente.",
      );
    }
    if (caught.code.startsWith("teams.invalid_")) {
      return present(
        "Los datos de la cuenta de juego no son válidos. Revísalos e inténtalo nuevamente.",
      );
    }
    return present(
      caught.code === "organizations.invalid_name"
        ? "El nombre de la organización no es válido."
        : "No pudimos crear la organización. Inténtalo nuevamente.",
    );
  }
  if (caught instanceof IdentityOnboardingClientError && caught.code.startsWith("teams.invalid_")) {
    return present(
      "Los datos de la cuenta de juego no son válidos. Revísalos e inténtalo nuevamente.",
    );
  }
  if (caught instanceof IdentityOnboardingClientError && path === "player") {
    return present("No pudimos guardar tu perfil de jugador. Inténtalo nuevamente.");
  }
  return present("No pudimos finalizar tu configuración. Inténtalo nuevamente.");
}
