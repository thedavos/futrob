import { describe, expect, it } from "vite-plus/test";
import {
  isIanaTimeZone,
  validateCompetitionDraftFields,
  type CompetitionDraftFieldsValue,
} from "./validate-competition-draft-input.ts";

function value(patch: Partial<CompetitionDraftFieldsValue> = {}): CompetitionDraftFieldsValue {
  return {
    name: "Liga Norte",
    gameEdition: "FC 26",
    customEdition: false,
    platform: "playstation",
    region: "america",
    timeZone: "America/Lima",
    format: "league",
    ...patch,
  };
}

describe("isIanaTimeZone", () => {
  it("accepts known IANA zones and rejects blanks or garbage", () => {
    expect(isIanaTimeZone("America/Lima")).toBe(true);
    expect(isIanaTimeZone("UTC")).toBe(true);
    expect(isIanaTimeZone("")).toBe(false);
    expect(isIanaTimeZone("Not/A_Zone")).toBe(false);
  });
});

describe("validateCompetitionDraftFields", () => {
  it("accepts a complete draft", () => {
    expect(validateCompetitionDraftFields(value())).toBeNull();
  });

  it("requires name", () => {
    expect(validateCompetitionDraftFields(value({ name: "  " }))?.field).toBe("name");
  });

  it("requires platform and format", () => {
    expect(validateCompetitionDraftFields(value({ platform: null }))?.field).toBe("platform");
    expect(validateCompetitionDraftFields(value({ format: null }))?.field).toBe("format");
  });
});
