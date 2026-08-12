import { describe, expect, it } from "vite-plus/test";
import { teamConsoleError } from "./competition-teams-console.tsx";
import { TeamsClientError } from "./teams-browser-client.ts";

describe("teamConsoleError", () => {
  it.each([
    ["teams.roster_full", "cupo máximo"],
    ["teams.roster_entry_inactive", "ya no está activo"],
    ["teams.roster_competition_conflict", "otro Team"],
    ["authorization.forbidden", "No tienes permiso"],
    ["teams.roster_invitation_expired", "ya expiró"],
    ["teams.client_network_error", "Conservamos tu contexto"],
  ])("maps %s to actionable copy", (code, expected) => {
    const error = teamConsoleError(new TeamsClientError(400, code));
    expect(error.message).toContain(expected);
  });

  it("keeps the request ID for support", () => {
    const requestId = "16feecf8-07f3-460e-8b09-e7c098445fde";
    expect(
      teamConsoleError(new TeamsClientError(403, "authorization.forbidden", requestId)),
    ).toMatchObject({ requestId });
  });
});
