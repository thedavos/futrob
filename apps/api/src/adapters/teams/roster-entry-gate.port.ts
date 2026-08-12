import type { CompetitionEntryRepository } from "@futrob/competitions";
import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { RosterEntryGatePort } from "@futrob/teams";

export class CompetitionRosterEntryGate implements RosterEntryGatePort {
  constructor(private readonly entries: CompetitionEntryRepository) {}

  async canMutateRoster(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<boolean> {
    const entry = await this.entries.findByCompetitionAndTeam(
      organizationId,
      competitionId,
      teamId,
    );
    return entry?.status === "pending" || entry?.status === "approved";
  }
}

export class DeferredRosterEntryGate implements RosterEntryGatePort {
  private inner: RosterEntryGatePort | null = null;

  bind(inner: RosterEntryGatePort): void {
    this.inner = inner;
  }

  canMutateRoster(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<boolean> {
    if (!this.inner) {
      throw new Error("Roster entry gate used before composition finished");
    }
    return this.inner.canMutateRoster(organizationId, competitionId, teamId);
  }
}
