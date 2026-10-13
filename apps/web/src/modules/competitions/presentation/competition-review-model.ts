import type {
  CompetitionDraftDto,
  CompetitionFormatDto,
  CompetitionMatchRulesDto,
} from "@futrob/api-contracts";

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

const TIEBREAKS = "Puntos → Diferencia de goles → Goles a favor";

export function teamCountLabel(count: number): string {
  return count === 1 ? "1 equipo" : `${count} equipos`;
}

export function reviewTiebreaks(): string {
  return TIEBREAKS;
}

export function datesLabel(schedule: CompetitionDraftDto["competition"]["schedule"]): string {
  const start = schedule.startsOn ? formatDay(schedule.startsOn) : null;
  const end = schedule.endsOn ? formatDay(schedule.endsOn) : null;
  if (!start && !end) return "Sin definir";
  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? "Sin definir";
}

export function matchesSummary(
  format: CompetitionFormatDto,
  rules: CompetitionDraftDto["rules"],
): string {
  return stageText(format, rules, (stage) =>
    encounterLabel(stage.rules.officialMatchesPerEncounter),
  );
}

export function pointsSummary(
  format: CompetitionFormatDto,
  rules: CompetitionDraftDto["rules"],
): string {
  return stageText(format, rules, (stage) => pointsLabel(stage.rules));
}

/** Mirrors publish validation. Dates are optional and are not part of this check. */
export function rulesArePublishable(
  format: CompetitionFormatDto,
  rules: CompetitionDraftDto["rules"],
): boolean {
  const needsRegular = format !== "knockout";
  const needsKnockout = format !== "league";
  if (Boolean(rules.regularStage) !== needsRegular) return false;
  if (Boolean(rules.knockoutStage) !== needsKnockout) return false;
  if (
    rules.maxRosterSize != null &&
    (!Number.isInteger(rules.maxRosterSize) || rules.maxRosterSize < 1)
  ) {
    return false;
  }
  return [rules.regularStage, rules.knockoutStage]
    .filter((stage) => stage != null)
    .every(matchRulesArePublishable);
}

function stageText(
  format: CompetitionFormatDto,
  rules: CompetitionDraftDto["rules"],
  render: (stage: { readonly label: string; readonly rules: CompetitionMatchRulesDto }) => string,
): string {
  const stages = stageRules(format, rules);
  if (stages.length === 1) {
    const only = stages[0];
    return only ? render(only) : "—";
  }
  return stages.map((stage) => `${stage.label}: ${render(stage)}`).join(" · ");
}

function stageRules(format: CompetitionFormatDto, rules: CompetitionDraftDto["rules"]) {
  const knockoutLabel = format === "league-playoffs" ? "Playoffs" : "Eliminación";
  return [
    rules.regularStage ? { label: "Etapa regular", rules: rules.regularStage } : null,
    rules.knockoutStage ? { label: knockoutLabel, rules: rules.knockoutStage } : null,
  ].filter((stage) => stage != null);
}

function encounterLabel(count: 1 | 2): string {
  return count === 1 ? "1 partido por enfrentamiento" : "2 partidos por enfrentamiento";
}

function pointsLabel(rules: CompetitionMatchRulesDto): string {
  return `Victoria ${rules.winPoints} · Empate ${rules.drawPoints} · Derrota ${rules.lossPoints}`;
}

function matchRulesArePublishable(rules: CompetitionMatchRulesDto): boolean {
  const points = [rules.winPoints, rules.drawPoints, rules.lossPoints];
  if (!points.every(Number.isInteger)) return false;
  if (
    !(
      rules.winPoints > rules.drawPoints &&
      rules.drawPoints >= rules.lossPoints &&
      rules.lossPoints >= 0
    )
  ) {
    return false;
  }
  if (rules.officialMatchesPerEncounter === 1 && rules.resolutionMode !== "independent_matches") {
    return false;
  }
  if (rules.officialMatchesPerEncounter !== 1 && rules.officialMatchesPerEncounter !== 2)
    return false;
  if (
    !Number.isInteger(rules.minimumRescheduleNoticeHours) ||
    rules.minimumRescheduleNoticeHours < 0
  ) {
    return false;
  }
  if (
    !Number.isInteger(rules.rescheduleProposalExpiryHours) ||
    rules.rescheduleProposalExpiryHours < 1 ||
    rules.rescheduleProposalExpiryHours > 72
  ) {
    return false;
  }
  return (
    rules.maxReschedulesPerTeam == null ||
    (Number.isInteger(rules.maxReschedulesPerTeam) && rules.maxReschedulesPerTeam >= 0)
  );
}

function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-");
  const label = MONTHS[Number(month) - 1];
  if (!year || !day || !label) return iso;
  return `${Number(day)} ${label} ${year}`;
}
