import type { CompetitionEntry } from "@futrob/competitions";
import {
  TEAM_PERMISSION,
  TeamAuthorizationForbidden,
  TeamNotFound,
  type CompetitionRosterMembership,
  type CompetitionRosterState,
  type ExternalClubConnection,
  type PlayerGameAccount,
  type Team,
} from "@futrob/teams";
import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type CompetitionId,
  type OrganizationId,
  type Page,
  type PageRequest,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";

export type TeamRosterManagementDependencies = {
  readonly authorization: AuthorizationPort;
  readonly entries: {
    list(
      organizationId: OrganizationId,
      competitionId: CompetitionId,
    ): Promise<readonly CompetitionEntry[]>;
    find(
      organizationId: OrganizationId,
      competitionId: CompetitionId,
      teamId: TeamId,
    ): Promise<CompetitionEntry | null>;
  };
  readonly teams: {
    find(organizationId: OrganizationId, teamId: TeamId): Promise<Team | null>;
  };
  readonly rosters: {
    list(
      organizationId: OrganizationId,
      competitionId: CompetitionId,
      teamId: TeamId,
    ): Promise<readonly CompetitionRosterMembership[]>;
  };
  readonly rosterStates: {
    get(
      organizationId: OrganizationId,
      competitionId: CompetitionId,
      teamId: TeamId,
    ): Promise<CompetitionRosterState | null>;
  };
  readonly externalClubs: {
    get(teamId: TeamId): Promise<ExternalClubConnection | null>;
  };
  readonly capacity: {
    getMaxRosterSize(competitionId: CompetitionId): Promise<number>;
  };
  readonly accounts: {
    listByProfile(playerProfileId: string): Promise<readonly PlayerGameAccount[]>;
  };
};

export type TeamRosterManagementSummary = {
  readonly team: Team;
  readonly entry: CompetitionEntry;
  readonly roster: {
    readonly state: "open" | "closed";
    readonly memberCount: number;
    readonly maxSize: number;
    readonly lockedAt: Date | null;
  };
  readonly externalClub: ExternalClubConnection | null;
};

export type TeamRosterMemberPresentation = {
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
};

export type TeamRosterManagementDetail = TeamRosterManagementSummary & {
  readonly members: readonly {
    readonly membership: CompetitionRosterMembership;
    readonly presentation: TeamRosterMemberPresentation;
  }[];
};

type Scope = {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
};

type VisibleTeam = {
  readonly team: Team;
  readonly entry: CompetitionEntry;
};

export class ListTeamRosterManagementUseCase {
  constructor(private readonly deps: TeamRosterManagementDependencies) {}

  async execute(input: Scope & PageRequest): Promise<Page<TeamRosterManagementSummary>> {
    const entries = await this.deps.entries.list(input.organizationId, input.competitionId);
    const visible = (await Promise.all(entries.map((entry) => this.visibleTeam(input, entry))))
      .filter((row): row is VisibleTeam => row !== null)
      .sort(compareVisibleTeams);

    const start = findCursorStart(visible, input.cursor);
    const page = visible.slice(start, start + input.limit);
    const maxSize = await this.deps.capacity.getMaxRosterSize(input.competitionId);
    const items = await Promise.all(
      page.map(({ team, entry }) => this.buildSummary(input, team, entry, maxSize)),
    );
    const hasNext = start + page.length < visible.length;

    return {
      items,
      nextCursor: hasNext && page.length > 0 ? encodeCursor(page.at(-1)!.team.id) : undefined,
    };
  }

  private async visibleTeam(input: Scope, entry: CompetitionEntry): Promise<VisibleTeam | null> {
    const team = await this.deps.teams.find(input.organizationId, entry.teamId);
    if (!team) return null;
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: TEAM_PERMISSION.rosterRead,
      scope: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: team.id,
      },
    });
    return decision.allowed ? { team, entry } : null;
  }

  private async buildSummary(
    input: Scope,
    team: Team,
    entry: CompetitionEntry,
    maxSize: number,
  ): Promise<TeamRosterManagementSummary> {
    const [memberships, state, externalClub] = await Promise.all([
      this.deps.rosters.list(input.organizationId, input.competitionId, team.id),
      this.deps.rosterStates.get(input.organizationId, input.competitionId, team.id),
      this.deps.externalClubs.get(team.id),
    ]);
    return summary(team, entry, memberships.length, maxSize, state, externalClub);
  }
}

export class GetTeamRosterManagementUseCase {
  constructor(private readonly deps: TeamRosterManagementDependencies) {}

  async execute(
    input: Scope & { readonly teamId: TeamId },
  ): Promise<Result<TeamRosterManagementDetail, TeamAuthorizationForbidden | TeamNotFound>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: TEAM_PERMISSION.rosterRead,
      scope: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
      },
    });
    if (!decision.allowed) {
      return err(
        new TeamAuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot read this Team roster",
          permission: TEAM_PERMISSION.rosterRead,
        }),
      );
    }

    const [team, entry] = await Promise.all([
      this.deps.teams.find(input.organizationId, input.teamId),
      this.deps.entries.find(input.organizationId, input.competitionId, input.teamId),
    ]);
    if (!team || !entry) {
      return err(new TeamNotFound({ code: "teams.not_found", message: "Team not found" }));
    }

    const [memberships, state, externalClub, maxSize] = await Promise.all([
      this.deps.rosters.list(input.organizationId, input.competitionId, input.teamId),
      this.deps.rosterStates.get(input.organizationId, input.competitionId, input.teamId),
      this.deps.externalClubs.get(input.teamId),
      this.deps.capacity.getMaxRosterSize(input.competitionId),
    ]);
    const members = await Promise.all(
      memberships.map(async (membership) => {
        const accounts = await this.deps.accounts.listByProfile(membership.playerProfileId);
        const account = membership.gameAccountId
          ? accounts.find((candidate) => candidate.id === membership.gameAccountId)
          : accounts[0];
        return {
          membership,
          presentation: {
            displayName: account?.identifier ?? null,
            avatarUrl: null,
          },
        };
      }),
    );

    return ok({
      ...summary(team, entry, memberships.length, maxSize, state, externalClub),
      members,
    });
  }
}

function compareVisibleTeams(left: VisibleTeam, right: VisibleTeam): number {
  const byName = left.team.name.localeCompare(right.team.name, "es", {
    sensitivity: "base",
  });
  return byName || left.team.id.localeCompare(right.team.id);
}

function summary(
  team: Team,
  entry: CompetitionEntry,
  memberCount: number,
  maxSize: number,
  state: CompetitionRosterState | null,
  externalClub: ExternalClubConnection | null,
): TeamRosterManagementSummary {
  return {
    team,
    entry,
    roster: {
      state: state?.lockedAt ? "closed" : "open",
      memberCount,
      maxSize,
      lockedAt: state?.lockedAt ?? null,
    },
    externalClub,
  };
}

function encodeCursor(teamId: TeamId): string {
  return Buffer.from(teamId).toString("base64url");
}

function findCursorStart(rows: readonly VisibleTeam[], cursor: string | undefined): number {
  if (!cursor) return 0;
  const teamId = Buffer.from(cursor, "base64url").toString("utf8");
  const index = rows.findIndex((row) => row.team.id === teamId);
  return index < 0 ? rows.length : index + 1;
}
