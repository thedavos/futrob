import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type {
  FixtureRoundName,
  FixtureSide,
  FixtureStageKind,
} from "./competition-fixture-view.ts";

/** Stage names already live with the rules copy. The fixture reuses them. */
export function fixtureStageLabel(kind: FixtureStageKind, t: Translator): string {
  switch (kind) {
    case "league":
      return t("competitionRules.stage.league");
    case "groups":
      return t("competitionRules.stage.groups");
    case "knockout":
      return t("competitionRules.stage.knockout");
    case "playoffs":
      return t("competitionRules.stage.playoffs");
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function fixtureRoundLabel(name: FixtureRoundName, t: Translator): string {
  switch (name.kind) {
    case "matchday":
      return t("fixture.round.matchday", { number: name.number });
    case "final":
      return t("fixture.round.final");
    case "semifinal":
      return t("fixture.round.semifinal");
    case "quarterfinal":
      return t("fixture.round.quarterfinal");
    case "roundOf16":
      return t("fixture.round.roundOf16");
    case "round":
      return t("fixture.round.number", { number: name.number });
    default: {
      const exhaustive: never = name;
      return exhaustive;
    }
  }
}

export function fixtureSideLabel(side: FixtureSide, t: Translator): string {
  switch (side.kind) {
    case "team":
      return side.name ?? t("fixture.side.unknownTeam");
    case "bye":
      return t("fixture.side.bye");
    case "winner":
      return side.from ? winnerLabel(side.from, t) : t("fixture.side.winner.unknown");
    case "groupRank":
      return t("fixture.side.groupRank", {
        place: ordinal(side.rank, t.locale),
        group: side.group,
      });
    case "stageRank":
      return t("fixture.side.stageRank", {
        place: ordinal(side.rank, t.locale),
        stage: fixtureStageLabel(side.stage, t),
      });
    default: {
      const exhaustive: never = side;
      return exhaustive;
    }
  }
}

function winnerLabel(
  from: { readonly round: FixtureRoundName; readonly order: number },
  t: Translator,
): string {
  switch (from.round.kind) {
    case "final":
      return t("fixture.side.winner.final");
    case "semifinal":
      return t("fixture.side.winner.semifinal", { order: from.order });
    case "quarterfinal":
      return t("fixture.side.winner.quarterfinal", { order: from.order });
    case "roundOf16":
      return t("fixture.side.winner.roundOf16", { order: from.order });
    case "matchday":
      return t("fixture.side.winner.matchday", { number: from.round.number, order: from.order });
    case "round":
      return t("fixture.side.winner.round", { number: from.round.number, order: from.order });
    default: {
      const exhaustive: never = from.round;
      return exhaustive;
    }
  }
}

function ordinal(rank: number, locale: Translator["locale"]): string {
  if (locale === "en") {
    const mod100 = rank % 100;
    const mod10 = rank % 10;
    const suffix =
      mod100 >= 11 && mod100 <= 13
        ? "th"
        : mod10 === 1
          ? "st"
          : mod10 === 2
            ? "nd"
            : mod10 === 3
              ? "rd"
              : "th";
    return `${rank}${suffix}`;
  }
  return `${rank}.º`;
}
