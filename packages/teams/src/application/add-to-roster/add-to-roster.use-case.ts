import {
  err,
  ok,
  type ClockPort,
  type ActorId,
  type AuthorizationPort,
  type CompetitionId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type {
  CompetitionRosterMembership,
  RosterMembershipRole,
} from "../../domain/entities/competition-roster-membership.ts";
import {
  GameAccountNotFound,
  RosterCompetitionConflict,
  RosterFull,
  RosterLocked,
  RosterEntryInactive,
  TeamNotFound,
  type AddToRosterError,
  type AddToRosterUncheckedError,
} from "../../domain/errors/team.errors.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";
import type { CompetitionRosterStateRepository } from "../../domain/ports/competition-roster-state.repository.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";
import type { RosterCapacityPort } from "../../domain/ports/roster-capacity.port.ts";
import type { RosterEntryGatePort } from "../../domain/ports/roster-entry-gate.port.ts";
import type { RosterMutationPort } from "../../domain/ports/roster-mutation.port.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";
import { TEAM_PERMISSION } from "../../domain/policies/team-permissions.ts";
import { teamPermissionError } from "../require-team-permission.ts";

export interface AddToRosterInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly playerProfileId: string;
  readonly gameAccountId?: string | null;
  readonly role: RosterMembershipRole;
}

type AddToRosterCoreInput = Omit<AddToRosterInput, "actorId">;
type AddToRosterCoreDependencies = {
  readonly teams: TeamRepository;
  readonly rosters: CompetitionRosterMembershipRepository;
  readonly rosterStates: CompetitionRosterStateRepository;
  readonly capacity: RosterCapacityPort;
  readonly entryGate: RosterEntryGatePort;
  readonly accounts: PlayerGameAccountRepository;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
};

/** Package-internal core used after a trusted invitation has been claimed. */
export async function addToRosterUnchecked(
  deps: AddToRosterCoreDependencies,
  input: AddToRosterCoreInput,
): Promise<Result<CompetitionRosterMembership, AddToRosterUncheckedError>> {
  const team = await deps.teams.findById(input.organizationId, input.teamId);
  if (!team) {
    return err(new TeamNotFound({ code: "teams.not_found", message: "Team not found" }));
  }

  const sameTeam = await deps.rosters.findByTeamPlayerCompetition(
    input.teamId,
    input.playerProfileId,
    input.competitionId,
  );
  if (sameTeam) return ok(sameTeam);

  const rosterState = await deps.rosterStates.get(
    input.organizationId,
    input.competitionId,
    input.teamId,
  );
  if (rosterState?.lockedAt) {
    return err(
      new RosterLocked({
        code: "teams.roster_locked",
        message: "Roster is locked for this competition",
      }),
    );
  }

  const canMutate = await deps.entryGate.canMutateRoster(
    input.organizationId,
    input.competitionId,
    input.teamId,
  );
  if (!canMutate) {
    return err(
      new RosterEntryInactive({
        code: "teams.roster_entry_inactive",
        message: "Roster writes are closed for this competition entry",
      }),
    );
  }

  const maxSize = await deps.capacity.getMaxRosterSize(input.competitionId);
  const currentMembers = await deps.rosters.listByTeam(
    input.organizationId,
    input.competitionId,
    input.teamId,
  );
  if (currentMembers.length >= maxSize) {
    return err(
      new RosterFull({ code: "teams.roster_full", message: "Roster has reached maximum capacity" }),
    );
  }

  const otherTeam = await deps.rosters.findByPlayerAndCompetition(
    input.playerProfileId,
    input.competitionId,
  );
  if (otherTeam) {
    return err(
      new RosterCompetitionConflict({
        code: "teams.roster_competition_conflict",
        message: "Player already belongs to a team in this competition",
      }),
    );
  }

  const gameAccountId: string | null = input.gameAccountId ?? null;
  if (gameAccountId) {
    const accounts = await deps.accounts.listByProfile(input.playerProfileId);
    if (!accounts.some((account) => account.id === gameAccountId)) {
      return err(
        new GameAccountNotFound({
          code: "teams.game_account_not_found",
          message: "Game account does not belong to this player profile",
        }),
      );
    }
  }

  const added = await deps.rosters.add({
    id: deps.ids.generate(),
    organizationId: input.organizationId,
    competitionId: input.competitionId,
    teamId: input.teamId,
    playerProfileId: input.playerProfileId,
    gameAccountId,
    role: input.role === "captain" ? "player" : input.role,
    createdAt: deps.clock.now(),
  });
  if (!added) {
    return err(
      new RosterCompetitionConflict({
        code: "teams.roster_competition_conflict",
        message: "Player already belongs to a team in this competition",
      }),
    );
  }
  if (input.role !== "captain") return ok(added);

  const previousCaptain = currentMembers.find((member) => member.role === "captain");
  if (previousCaptain) {
    await deps.rosters.update({ ...previousCaptain, role: "player" });
  }
  return ok(await deps.rosters.update({ ...added, role: "captain" }));
}

export class AddToRosterUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
      readonly rosterStates: CompetitionRosterStateRepository;
      readonly capacity: RosterCapacityPort;
      readonly entryGate: RosterEntryGatePort;
      readonly accounts: PlayerGameAccountRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
      readonly authorization: AuthorizationPort;
      readonly mutations: RosterMutationPort;
    },
  ) {}

  async execute(
    input: AddToRosterInput,
  ): Promise<Result<CompetitionRosterMembership, AddToRosterError>> {
    const forbidden = await teamPermissionError({
      authorization: this.deps.authorization,
      actorId: input.actorId,
      permission: TEAM_PERMISSION.rosterManage,
      scope: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
      },
    });
    if (forbidden) return err(forbidden);
    return this.deps.mutations.runExclusive(
      {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
      },
      () => addToRosterUnchecked(this.deps, input),
    );
  }
}
