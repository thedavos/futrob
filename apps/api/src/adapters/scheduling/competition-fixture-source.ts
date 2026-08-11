import type { CompetitionEntryRepository, CompetitionRepository } from "@futrob/competitions";
import type {
  CompetitionFixtureSourcePort,
  CompetitionFixtureSourceSnapshot,
} from "@futrob/scheduling";

export class CompetitionFixtureSourceAdapter implements CompetitionFixtureSourcePort {
  constructor(
    private readonly deps: {
      readonly competitions: Pick<CompetitionRepository, "findById">;
      readonly entries: Pick<CompetitionEntryRepository, "listByCompetition">;
    },
  ) {}

  async load(
    input: Parameters<CompetitionFixtureSourcePort["load"]>[0],
  ): Promise<CompetitionFixtureSourceSnapshot | null> {
    const draft = await this.deps.competitions.findById(input.organizationId, input.competitionId);
    if (!draft || !this.deps.entries.listByCompetition) return null;
    const entries = await this.deps.entries.listByCompetition(
      input.organizationId,
      input.competitionId,
    );
    const approvedParticipants = entries
      .filter((entry) => entry.status === "approved")
      .sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id),
      )
      .map((entry) => entry.teamId);
    const regular =
      draft.rules.regularStage?.officialMatchesPerEncounter ??
      draft.rules.knockoutStage?.officialMatchesPerEncounter;
    const knockout =
      draft.rules.knockoutStage?.officialMatchesPerEncounter ??
      draft.rules.regularStage?.officialMatchesPerEncounter;
    if (!regular || !knockout) return null;

    return {
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
      status: draft.competition.status,
      format: draft.competition.format,
      timeZone: draft.competition.timeZone,
      rulesVersion: draft.rules.version,
      officialMatchCounts: { regular, knockout },
      approvedParticipants,
    };
  }
}
