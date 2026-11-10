import type { CompetitionMatchRules } from "@futrob/competitions";
import { err, ok, type Result } from "@futrob/shared-kernel";
import type {
  PublicRules,
  PublicStageRules,
} from "../../domain/entities/public-competition.ts";
import type { PublicCompetitionNotFound } from "../../domain/errors/public-portal.errors.ts";
import type { PublicCompetitionKey } from "../../domain/public-competition-key.ts";
import type { PublicRulesReaderPort } from "../../domain/ports/public-rules-reader.port.ts";
import type { PublishedCompetitionReaderPort } from "../../domain/ports/published-competition-reader.port.ts";
import { resolvePublishedCompetition } from "../resolve-published-competition.ts";

export interface GetPublicRulesDependencies {
  readonly competitions: PublishedCompetitionReaderPort;
  readonly rules: PublicRulesReaderPort;
}

export class GetPublicRulesUseCase {
  constructor(private readonly deps: GetPublicRulesDependencies) {}

  /**
   * What a spectator needs to read the table and the bracket: points, matches per Encounter,
   * how ties resolve and whether matches may move. Approval workflow settings stay private.
   */
  async execute(input: {
    readonly key: PublicCompetitionKey;
  }): Promise<Result<PublicRules, PublicCompetitionNotFound>> {
    const resolved = await resolvePublishedCompetition(this.deps.competitions, input.key);
    if (!resolved.isOk()) return err(resolved.error);
    const { scope, format } = resolved.value;

    const source = await this.deps.rules.read(scope);
    if (!source) return ok({ format, teams: null, stages: [], maxRosterSize: null });

    const stages: PublicStageRules[] = [];
    if (source.regularStage) stages.push(toStageRules("regular", source.regularStage));
    if (source.knockoutStage) stages.push(toStageRules("knockout", source.knockoutStage));
    return ok({
      format,
      teams: { min: source.teams.min, max: source.teams.max },
      stages,
      maxRosterSize: source.maxRosterSize,
    });
  }
}

function toStageRules(
  stage: PublicStageRules["stage"],
  rules: CompetitionMatchRules,
): PublicStageRules {
  return {
    stage,
    winPoints: rules.winPoints,
    drawPoints: rules.drawPoints,
    lossPoints: rules.lossPoints,
    officialMatchesPerEncounter: rules.officialMatchesPerEncounter,
    resolutionMode: rules.resolutionMode,
    rescheduling: rules.allowRescheduling
      ? {
          allowed: true,
          maxPerTeam: rules.maxReschedulesPerTeam,
          minimumNoticeHours: rules.minimumRescheduleNoticeHours,
        }
      : { allowed: false },
  };
}
