import { FutrobApiError } from "@futrob/sdk";
import { describe, expect, it } from "vite-plus/test";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { swissCommandRecovery, swissRecoveryText } from "./swiss-fixture-commands.ts";

const apiError = (status: number, code: string) =>
  new FutrobApiError({ status, body: { code, messageKey: `errors.${code}` } });

describe("swissCommandRecovery", () => {
  const es = createTranslator("es");
  const en = createTranslator("en");

  it.each([
    ["scheduling.swiss_round_not_current", 409, "close", "Esa ronda ya no es la que se está"],
    ["scheduling.swiss_team_already_withdrawn", 409, "withdraw", "Ese equipo ya estaba retirado"],
    ["scheduling.not_swiss_fixture", 409, "close", "Este calendario no es de sistema suizo"],
    ["scheduling.fixture_generation_conflict", 409, "generate", "Ya existe un calendario"],
    ["scheduling.fixture_source_not_published", 409, "generate", "Publica la competición"],
    ["scheduling.fixture_plan_not_found", 404, "close", "ya no está vigente"],
    ["authorization.forbidden", 403, "withdraw", "Ya no tienes permiso"],
  ] as const)("drops the form and explains %s", (code, status, command, text) => {
    const recovery = swissCommandRecovery(apiError(status, code), command);
    expect(recovery.draft).toBe("close");
    expect(swissRecoveryText(recovery, es)).toContain(text);
  });

  it("keeps the form on the field a refusal names", () => {
    expect(
      swissCommandRecovery(apiError(400, "scheduling.swiss_team_not_participant"), "withdraw"),
    ).toMatchObject({ draft: "keep", field: "team", uncertain: false });
    expect(
      swissCommandRecovery(apiError(400, "scheduling.invalid_fixture_configuration"), "generate"),
    ).toMatchObject({ draft: "keep", field: "rounds" });
  });

  it("keeps the form after a concurrent change, which rolled the command back", () => {
    expect(
      swissCommandRecovery(apiError(409, "scheduling.fixture_update_conflict"), "close"),
    ).toMatchObject({ draft: "keep", uncertain: false });
  });

  it("treats no answer and a server failure as an unknown outcome", () => {
    for (const error of [null, apiError(500, "api.unexpected_error"), apiError(503, "x")]) {
      const recovery = swissCommandRecovery(error, "close");
      expect(recovery).toMatchObject({ draft: "keep", uncertain: true });
      expect(swissRecoveryText(recovery, es)).toContain("No sabemos si se aplicó");
      expect(swissRecoveryText(recovery, en)).toContain("We don't know whether it applied");
    }
  });

  it("shows the plan upsell for a 402, keeping the form", () => {
    expect(
      swissCommandRecovery(apiError(402, "competitions.format_not_in_plan"), "generate"),
    ).toEqual({
      draft: "keep",
      uncertain: false,
      field: null,
      message: { upsell: "competitions.format_not_in_plan" },
    });
  });

  it("falls back to the code's own copy", () => {
    const recovery = swissCommandRecovery(apiError(400, "api.validation_error"), "close");
    expect(recovery.message).toEqual({ code: "api.validation_error" });
  });
});
