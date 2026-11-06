import { describe, expect, it } from "vite-plus/test";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import {
  fixtureByeLabel,
  fixtureRoundLabel,
  fixtureSideAccessibleName,
  fixtureSideLabel,
  fixtureStageLabel,
} from "./competition-fixture-labels.ts";
import { competitionFixtureView } from "./competition-fixture-view.ts";
import { groupsKnockoutFixture, swissFixture } from "./competition-fixture.fixtures.ts";

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

  it("names a Swiss stage, its rounds by number and who rests", () => {
    const swiss = competitionFixtureView(swissFixture)?.stages[0];
    const bye = swiss?.rounds[1]?.encounters[1];
    const es = createTranslator("es");
    const en = createTranslator("en");

    expect(swiss && fixtureStageLabel(swiss.kind, es)).toBe("Fase suiza");
    expect(swiss && fixtureStageLabel(swiss.kind, en)).toBe("Swiss stage");
    expect(swiss && fixtureRoundLabel(swiss.rounds[0]!.name, es)).toBe("Ronda 1");
    expect(bye && fixtureByeLabel(bye.home, bye.away, es)).toBe("Maderas FC descansa");
    expect(bye && fixtureByeLabel(bye.home, bye.away, en)).toBe("Maderas FC has a bye");
  });

  it("says a withdrawn Team is withdrawn in the accessible name only when it is", () => {
    const t = createTranslator("es");
    const side = { kind: "team", teamId: "t", name: "Norte", withdrawn: true } as const;
    expect(fixtureSideAccessibleName(side, t)).toBe("Norte (Retirado)");
    expect(fixtureSideAccessibleName({ ...side, withdrawn: false }, t)).toBe("Norte");
  });

  it("keeps a missing team, a bye and a league place distinct", () => {
    const t = createTranslator("es");
    expect(
      fixtureSideLabel({ kind: "team", teamId: "team-gone", name: null, withdrawn: false }, t),
    ).toBe("Equipo no disponible");
    expect(fixtureSideLabel({ kind: "bye" }, t)).toBe("Descansa");
    expect(fixtureSideLabel({ kind: "stageRank", stage: "league", rank: 2 }, t)).toBe(
      "2.º de Liga",
    );
    expect(fixtureSideLabel({ kind: "winner", from: null }, t)).toBe("Ganador por definir");
  });
});
