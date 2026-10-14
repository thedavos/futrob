import { describe, expect, it } from "vite-plus/test";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import { entryInvitationErrorMessage } from "./entry-invitation-copy.ts";

describe("entryInvitationErrorMessage", () => {
  it("explains a full competition from its wire code", () => {
    expect(
      entryInvitationErrorMessage(
        new CompetitionsClientError(409, "competitions.capacity_reached"),
        "Algo falló.",
      ),
    ).toBe("La competición ya alcanzó su cupo de equipos.");
  });

  it("falls back for unknown codes and values without a code", () => {
    expect(
      entryInvitationErrorMessage(new CompetitionsClientError(400, "unknown.code"), "Algo falló."),
    ).toBe("Algo falló.");
    expect(entryInvitationErrorMessage(null, "Algo falló.")).toBe("Algo falló.");
  });
});
