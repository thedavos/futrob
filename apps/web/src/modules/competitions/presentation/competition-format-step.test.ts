import { describe, expect, it } from "vite-plus/test";
import {
  encounterResolutionCaption,
  matchesPerEncounterSummary,
  roundRobinNotice,
  seriesNotice,
} from "./competition-format-copy.ts";

describe("format structure copy", () => {
  it("describes how many matches resolve an encounter", () => {
    expect(encounterResolutionCaption(1)).toBe("Cada enfrentamiento se resuelve en un partido.");
    expect(encounterResolutionCaption(2)).toBe("Cada enfrentamiento se resuelve en 2 partidos.");
  });

  it("describes how often teams meet and how each meeting is played", () => {
    expect(roundRobinNotice("single", 1)).toBe(
      "Cada equipo se enfrenta una vez a cada rival, en un partido.",
    );
    expect(roundRobinNotice("single", 2)).toBe(
      "Cada equipo se enfrenta una vez a cada rival. Ese enfrentamiento se juega en 2 partidos.",
    );
    expect(roundRobinNotice("double", 1)).toBe(
      "Cada equipo se enfrenta dos veces a cada rival, de local y de visitante. Cada enfrentamiento es un partido.",
    );
    expect(roundRobinNotice("double", 2)).toBe(
      "Cada equipo se enfrenta dos veces a cada rival, de local y de visitante. Cada enfrentamiento se juega en 2 partidos.",
    );
  });

  it("names the matches per encounter for the active format", () => {
    expect(matchesPerEncounterSummary("league", 2, null)).toBe("2 partidos");
    expect(matchesPerEncounterSummary("knockout", null, 1)).toBe("1 partido");
    expect(matchesPerEncounterSummary("groups-knockout", 2, 2)).toBe("2 partidos");
    expect(matchesPerEncounterSummary("groups-knockout", 1, 2)).toBe(
      "Grupos 1 partido · Eliminación 2 partidos",
    );
    expect(matchesPerEncounterSummary("league-playoffs", 1, 2)).toBe(
      "Liga 1 partido · Playoffs 2 partidos",
    );
  });

  it("describes a knockout series from the match count", () => {
    expect(seriesNotice(1)).toBe("Cada serie se decide en un partido.");
    expect(seriesNotice(2)).toBe("Cada serie se decide en 2 partidos.");
  });
});
