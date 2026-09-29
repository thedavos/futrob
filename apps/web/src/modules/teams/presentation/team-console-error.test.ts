import { describe, expect, it } from "vite-plus/test";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { teamConsoleError } from "./team-console-error.ts";
import { TeamsClientError } from "./teams-browser-client.ts";

const es = createTranslator("es");
const en = createTranslator("en");

describe("teamConsoleError", () => {
  it.each([
    ["teams.roster_full", "cupo máximo", "maximum size"],
    ["teams.roster_entry_inactive", "ya no está activo", "no longer active"],
    ["teams.roster_competition_conflict", "otro equipo", "another team"],
    ["authorization.forbidden", "No tienes permiso", "don't have permission"],
    ["teams.roster_invitation_expired", "ya expiró", "has expired"],
    ["teams.client_network_error", "Conservamos tu contexto", "context is kept"],
  ])("maps %s to actionable copy in both languages", (code, spanish, english) => {
    const error = new TeamsClientError(400, code);
    expect(teamConsoleError(error, es).message).toContain(spanish);
    expect(teamConsoleError(error, en).message).toContain(english);
  });

  it("falls back to the generic message for unknown codes and plain errors", () => {
    expect(teamConsoleError(new TeamsClientError(500, "teams.unknown"), en).message).toBe(
      en("errors.fallback"),
    );
    expect(teamConsoleError(new Error("boom"), es).message).toBe(es("errors.fallback"));
  });

  it("keeps the request ID for support", () => {
    const requestId = "16feecf8-07f3-460e-8b09-e7c098445fde";
    expect(
      teamConsoleError(new TeamsClientError(403, "authorization.forbidden", requestId), es),
    ).toMatchObject({ requestId });
  });
});
