import { describe, expect, it } from "vite-plus/test";
import { resolveCompetitionTimeZone } from "./competition-time-zone.ts";

describe("resolveCompetitionTimeZone", () => {
  it("starts from the organization's zone once it is known", () => {
    expect(
      resolveCompetitionTimeZone({
        edited: false,
        editedTimeZone: "America/Lima",
        organization: { status: "ready", timeZone: "America/Bogota" },
      }),
    ).toEqual({ timeZone: "America/Bogota", blocked: null });
  });

  it("shows nothing and waits while the organization's zone loads", () => {
    expect(
      resolveCompetitionTimeZone({
        edited: false,
        editedTimeZone: "America/Lima",
        organization: { status: "loading" },
      }),
    ).toEqual({ timeZone: "", blocked: "loading" });
  });

  it("does not fall back to the browser zone when the organization's zone failed to load", () => {
    expect(
      resolveCompetitionTimeZone({
        edited: false,
        editedTimeZone: "America/Lima",
        organization: { status: "error" },
      }),
    ).toEqual({ timeZone: "", blocked: "error" });
  });

  it.each([
    ["loading", { status: "loading" }],
    ["error", { status: "error" }],
    ["ready", { status: "ready", timeZone: "America/Bogota" }],
  ] as const)(
    "keeps the zone the organizer picked when the organization is %s",
    (_label, organization) => {
      expect(
        resolveCompetitionTimeZone({ edited: true, editedTimeZone: "Europe/Madrid", organization }),
      ).toEqual({ timeZone: "Europe/Madrid", blocked: null });
    },
  );
});
