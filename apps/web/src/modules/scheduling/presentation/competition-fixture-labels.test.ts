import { describe, expect, it } from "vite-plus/test";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import {
  fixtureRoundLabel,
  fixtureSideLabel,
  fixtureStageLabel,
} from "./competition-fixture-labels.ts";
import { competitionFixtureView } from "./competition-fixture-view.ts";
import { groupsKnockoutFixture } from "./competition-fixture.fixtures.ts";

describe("fixture labels", () => {
  const view = competitionFixtureView(groupsKnockoutFixture);
  const groups = view?.stages[0];
  const knockout = view?.stages[1];
  const opening = groups?.rounds[0]?.encounters[0];
  const final = knockout?.rounds[1]?.encounters[0];

  it("names stages, matchdays and open slots in Spanish", () => {
    const t = createTranslator("es");
    expect(groups && fixtureStageLabel(groups.kind, t)).toBe("Grupos");
    expect(groups && fixtureRoundLabel(groups.rounds[0]!.name, t)).toBe("Jornada 1");
    expect(knockout && fixtureRoundLabel(knockout.rounds[0]!.name, t)).toBe("Semifinales");
    expect(opening && fixtureSideLabel(opening.home, t)).toBe("Cuervos FC");
    expect(opening && fixtureSideLabel(opening.away, t)).toBe("Maderas FC");
    expect(knockout && fixtureSideLabel(knockout.rounds[0]!.encounters[0]!.home, t)).toBe(
      "1.º del grupo A",
    );
    expect(final && fixtureSideLabel(final.home, t)).toBe("Ganador de la semifinal 1");
    expect(final && fixtureSideLabel(final.away, t)).toBe("Ganador de la semifinal 2");
  });

  it("names the same fixture in English", () => {
    const t = createTranslator("en");
    expect(groups && fixtureStageLabel(groups.kind, t)).toBe("Groups");
    expect(groups && fixtureRoundLabel(groups.rounds[0]!.name, t)).toBe("Matchday 1");
    expect(knockout && fixtureRoundLabel(knockout.rounds[0]!.name, t)).toBe("Semifinals");
    expect(knockout && fixtureSideLabel(knockout.rounds[0]!.encounters[0]!.home, t)).toBe(
      "1st in group A",
    );
    expect(final && fixtureSideLabel(final.home, t)).toBe("Winner of semifinal 1");
  });

  it("keeps a missing team, a bye and a league place distinct", () => {
    const t = createTranslator("es");
    expect(fixtureSideLabel({ kind: "team", teamId: "team-gone", name: null }, t)).toBe(
      "Equipo no disponible",
    );
    expect(fixtureSideLabel({ kind: "bye" }, t)).toBe("Descansa");
    expect(fixtureSideLabel({ kind: "stageRank", stage: "league", rank: 2 }, t)).toBe(
      "2.º de Liga",
    );
    expect(fixtureSideLabel({ kind: "winner", from: null }, t)).toBe("Ganador por definir");
  });
});
