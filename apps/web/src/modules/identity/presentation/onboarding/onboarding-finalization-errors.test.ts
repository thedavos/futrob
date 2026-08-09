import { describe, expect, it } from "vite-plus/test";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import { finalizationError } from "./onboarding-finalization-errors.ts";

describe("finalizationError", () => {
  it.each([
    [
      "organizations.invitation_not_found",
      "No encontramos esa invitación. Revisa el código e inténtalo nuevamente.",
    ],
    [
      "organizations.invitation_expired",
      "La invitación ha caducado. Solicita una nueva al organizador.",
    ],
    [
      "organizations.invitation_revoked",
      "La invitación fue revocada. Solicita una nueva al organizador.",
    ],
    ["organizations.invitation_invalid", "La invitación ya no está disponible."],
  ] as const)("maps invitation finish code %s", (code, message) => {
    expect(finalizationError("invitation", new IdentityOnboardingClientError(400, code))).toBe(
      message,
    );
  });

  it("maps organization name conflict and falls back for other org codes", () => {
    expect(
      finalizationError(
        "organization",
        new IdentityOnboardingClientError(409, "organizations.name_conflict"),
      ),
    ).toBe("Ese nombre de organización ya está en uso. Vuelve y elige otro.");
    expect(
      finalizationError(
        "organization",
        new IdentityOnboardingClientError(400, "organizations.invalid_name"),
      ),
    ).toBe("El nombre de la organización no es válido.");
    expect(
      finalizationError(
        "organization",
        new IdentityOnboardingClientError(500, "organizations.boom"),
      ),
    ).toBe("No pudimos crear la organización. Inténtalo nuevamente.");
  });

  it("maps player finish failures and unknown errors", () => {
    expect(
      finalizationError("player", new IdentityOnboardingClientError(502, "teams.invalid_platform")),
    ).toBe("Los datos de la cuenta de juego no son válidos. Revísalos e inténtalo nuevamente.");
    expect(
      finalizationError(
        "player",
        new IdentityOnboardingClientError(500, "identity.onboarding_failed"),
      ),
    ).toBe("No pudimos guardar tu perfil de jugador. Inténtalo nuevamente.");
    expect(finalizationError("player", new Error("network"))).toBe(
      "No pudimos finalizar tu configuración. Inténtalo nuevamente.",
    );
  });
});
