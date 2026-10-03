import type {
  ActorId,
  ClockPort,
  CompetitionId,
  IdGeneratorPort,
  OrganizationId,
  Result,
  TeamId,
} from "@futrob/shared-kernel";
import type { CompetitionRosterMembership } from "../../domain/entities/competition-roster-membership.ts";
import type { AddToRosterUncheckedError } from "../../domain/errors/team.errors.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";
import type { CompetitionRosterStateRepository } from "../../domain/ports/competition-roster-state.repository.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";
import type { RosterCapacityPort } from "../../domain/ports/roster-capacity.port.ts";
import type { RosterEntryGatePort } from "../../domain/ports/roster-entry-gate.port.ts";
import type { RosterMutationPort } from "../../domain/ports/roster-mutation.port.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";
import { addToRosterUnchecked } from "../add-to-roster/add-to-roster.use-case.ts";
import type { EnsurePlayerProfileUseCase } from "../ensure-player-profile/ensure-player-profile.use-case.ts";

export interface ClaimApplicantCaptaincyInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
}

/**
 * Trusted flow: puts the applicant on their new Team's roster as captain. Runs after the
 * pending CompetitionEntry exists, so the roster entry gate admits the write. Idempotent.
 */
export class ClaimApplicantCaptaincyUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
      readonly rosterStates: CompetitionRosterStateRepository;
      readonly capacity: RosterCapacityPort;
      readonly entryGate: RosterEntryGatePort;
      readonly accounts: PlayerGameAccountRepository;
      readonly ensurePlayerProfile: EnsurePlayerProfileUseCase;
      readonly mutations: RosterMutationPort;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: ClaimApplicantCaptaincyInput,
  ): Promise<Result<CompetitionRosterMembership, AddToRosterUncheckedError>> {
    const profile = await this.deps.ensurePlayerProfile.execute({ actorId: input.actorId });
    return this.deps.mutations.runExclusive(
      {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
      },
      () =>
        addToRosterUnchecked(this.deps, {
          organizationId: input.organizationId,
          competitionId: input.competitionId,
          teamId: input.teamId,
          playerProfileId: profile.id,
          role: "captain",
        }),
    );
  }
}
