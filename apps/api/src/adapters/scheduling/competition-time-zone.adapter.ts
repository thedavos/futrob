import type { CompetitionRepository } from "@futrob/competitions";
import type { CompetitionTimeZonePort } from "@futrob/scheduling";
import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";

export class CompetitionTimeZoneAdapter implements CompetitionTimeZonePort {
  constructor(private readonly competitions: Pick<CompetitionRepository, "findById">) {}

  async getTimeZone(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<string | null> {
    const draft = await this.competitions.findById(input.organizationId, input.competitionId);
    return draft?.competition.timeZone ?? null;
  }
}
