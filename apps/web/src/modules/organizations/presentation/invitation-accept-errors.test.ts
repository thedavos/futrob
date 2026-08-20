import { describe, expect, it } from "vite-plus/test";
import { OrganizationsClientError } from "@/modules/organizations/presentation/organizations-browser-client.ts";
import { invitationAcceptErrorMessage } from "./invitation-accept-errors.ts";

describe("invitationAcceptErrorMessage", () => {
  it.each([
    ["organizations.invitation_not_found", "No encontramos esa invitación."],
    ["organizations.invitation_expired", "La invitación ha caducado."],
    ["organizations.invitation_revoked", "La invitación fue revocada."],
    ["organizations.invitation_exhausted", "Esta invitación ya alcanzó el número máximo de usos."],
    ["organizations.invitation_invalid", "La invitación ya no es válida."],
    ["organizations.client_error", "No se pudo aceptar la invitación. Inténtalo de nuevo."],
  ] as const)("maps %s", (code, message) => {
    expect(
      invitationAcceptErrorMessage(
        new OrganizationsClientError({ status: 400, code, message: code }),
      ),
    ).toBe(message);
  });

  it("falls back for unknown errors", () => {
    expect(invitationAcceptErrorMessage(null)).toBe(
      "No se pudo aceptar la invitación. Inténtalo de nuevo.",
    );
  });
});
