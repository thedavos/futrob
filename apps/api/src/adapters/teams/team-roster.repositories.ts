import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type ActorId,
  type CompetitionId,
  type OrganizationId,
  type TeamId,
} from "@futrob/shared-kernel";
import type {
  ActiveTeamPreference,
  ActiveTeamPreferenceRepository,
  CompetitionRosterMembership,
  CompetitionRosterMembershipRepository,
  RosterMembershipRole,
  Team,
  TeamRepository,
} from "@futrob/teams";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryTeamRepository implements TeamRepository {
  readonly rows = new Map<TeamId, Team>();

  async findById(organizationId: OrganizationId, teamId: TeamId): Promise<Team | null> {
    const team = this.rows.get(teamId) ?? null;
    return team?.organizationId === organizationId ? team : null;
  }

  async findByCreationKey(creationKey: string): Promise<Team | null> {
    return [...this.rows.values()].find((row) => row.creationKey === creationKey) ?? null;
  }

  async listByOrganization(organizationId: OrganizationId) {
    return [...this.rows.values()]
      .filter((team) => team.organizationId === organizationId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async save(team: Team): Promise<Team> {
    this.rows.set(team.id, team);
    return team;
  }
}

export class InMemoryCompetitionRosterMembershipRepository implements CompetitionRosterMembershipRepository {
  readonly rows = new Map<string, CompetitionRosterMembership>();

  async findById(id: string): Promise<CompetitionRosterMembership | null> {
    return this.rows.get(id) ?? null;
  }

  async findByIdInScope(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
    id: string,
  ): Promise<CompetitionRosterMembership | null> {
    const row = this.rows.get(id);
    return row?.organizationId === organizationId &&
      row.competitionId === competitionId &&
      row.teamId === teamId
      ? row
      : null;
  }

  async findByPlayerAndCompetition(
    playerProfileId: string,
    competitionId: CompetitionId,
  ): Promise<CompetitionRosterMembership | null> {
    return (
      [...this.rows.values()].find(
        (row) => row.playerProfileId === playerProfileId && row.competitionId === competitionId,
      ) ?? null
    );
  }

  async findByTeamPlayerCompetition(
    teamId: TeamId,
    playerProfileId: string,
    competitionId: CompetitionId,
  ): Promise<CompetitionRosterMembership | null> {
    return (
      [...this.rows.values()].find(
        (row) =>
          row.teamId === teamId &&
          row.playerProfileId === playerProfileId &&
          row.competitionId === competitionId,
      ) ?? null
    );
  }

  async listByPlayerProfile(
    playerProfileId: string,
  ): Promise<readonly CompetitionRosterMembership[]> {
    return [...this.rows.values()].filter((row) => row.playerProfileId === playerProfileId);
  }

  async listByTeam(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<readonly CompetitionRosterMembership[]> {
    return [...this.rows.values()].filter(
      (row) =>
        row.organizationId === organizationId &&
        row.competitionId === competitionId &&
        row.teamId === teamId,
    );
  }

  async add(membership: CompetitionRosterMembership): Promise<CompetitionRosterMembership | null> {
    const existing = await this.findByPlayerAndCompetition(
      membership.playerProfileId,
      membership.competitionId,
    );
    if (existing && existing.teamId !== membership.teamId) return null;
    if (existing) return existing;
    this.rows.set(membership.id, membership);
    return membership;
  }

  async update(membership: CompetitionRosterMembership): Promise<CompetitionRosterMembership> {
    this.rows.set(membership.id, membership);
    return membership;
  }
}

export class InMemoryActiveTeamPreferenceRepository implements ActiveTeamPreferenceRepository {
  readonly rows = new Map<ActorId, ActiveTeamPreference>();

  async findByActor(actorId: ActorId): Promise<ActiveTeamPreference | null> {
    return this.rows.get(actorId) ?? null;
  }

  async save(preference: ActiveTeamPreference): Promise<ActiveTeamPreference> {
    this.rows.set(preference.actorId, preference);
    return preference;
  }
}

export class PostgresTeamRepository implements TeamRepository {
  constructor(private readonly pool: Pool) {}

  async findById(organizationId: OrganizationId, teamId: TeamId): Promise<Team | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, name, created_at, created_by_actor_id, creation_key
       FROM teams WHERE id = $1 AND organization_id = $2`,
      [teamId, organizationId],
    );
    return result.rows[0] ? rehydrateTeam(result.rows[0]) : null;
  }

  async findByCreationKey(creationKey: string): Promise<Team | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, name, created_at, created_by_actor_id, creation_key
       FROM teams WHERE creation_key = $1`,
      [creationKey],
    );
    return result.rows[0] ? rehydrateTeam(result.rows[0]) : null;
  }

  async save(team: Team): Promise<Team> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO teams (
         id, organization_id, name, created_at, created_by_actor_id, creation_key
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, organization_id, name, created_at, created_by_actor_id, creation_key`,
      [
        team.id,
        team.organizationId,
        team.name,
        team.createdAt.toISOString(),
        team.createdByActorId,
        team.creationKey,
      ],
    );
    return rehydrateTeam(result.rows[0]);
  }

  async listByOrganization(organizationId: OrganizationId) {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, name, created_at, created_by_actor_id, creation_key
       FROM teams WHERE organization_id = $1 ORDER BY name ASC`,
      [organizationId],
    );
    return result.rows.map(rehydrateTeam);
  }
}

export class PostgresCompetitionRosterMembershipRepository implements CompetitionRosterMembershipRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<CompetitionRosterMembership | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, player_profile_id,
              game_account_id, role, created_at
       FROM competition_roster_memberships WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? rehydrateRoster(result.rows[0]) : null;
  }

  async findByIdInScope(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
    id: string,
  ): Promise<CompetitionRosterMembership | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, player_profile_id,
              game_account_id, role, created_at
       FROM competition_roster_memberships
       WHERE id = $1 AND organization_id = $2 AND competition_id = $3 AND team_id = $4`,
      [id, organizationId, competitionId, teamId],
    );
    return result.rows[0] ? rehydrateRoster(result.rows[0]) : null;
  }

  async findByPlayerAndCompetition(
    playerProfileId: string,
    competitionId: CompetitionId,
  ): Promise<CompetitionRosterMembership | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, player_profile_id,
              game_account_id, role, created_at
       FROM competition_roster_memberships
       WHERE player_profile_id = $1 AND competition_id = $2`,
      [playerProfileId, competitionId],
    );
    return result.rows[0] ? rehydrateRoster(result.rows[0]) : null;
  }

  async findByTeamPlayerCompetition(
    teamId: TeamId,
    playerProfileId: string,
    competitionId: CompetitionId,
  ): Promise<CompetitionRosterMembership | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, player_profile_id,
              game_account_id, role, created_at
       FROM competition_roster_memberships
       WHERE team_id = $1 AND player_profile_id = $2 AND competition_id = $3`,
      [teamId, playerProfileId, competitionId],
    );
    return result.rows[0] ? rehydrateRoster(result.rows[0]) : null;
  }

  async listByPlayerProfile(
    playerProfileId: string,
  ): Promise<readonly CompetitionRosterMembership[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, player_profile_id,
              game_account_id, role, created_at
       FROM competition_roster_memberships
       WHERE player_profile_id = $1
       ORDER BY created_at ASC`,
      [playerProfileId],
    );
    return result.rows.map(rehydrateRoster);
  }

  async listByTeam(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<readonly CompetitionRosterMembership[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, player_profile_id,
              game_account_id, role, created_at
       FROM competition_roster_memberships
       WHERE organization_id = $1 AND competition_id = $2 AND team_id = $3
       ORDER BY created_at ASC`,
      [organizationId, competitionId, teamId],
    );
    return result.rows.map(rehydrateRoster);
  }

  async add(membership: CompetitionRosterMembership): Promise<CompetitionRosterMembership | null> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO competition_roster_memberships (
         id, organization_id, competition_id, team_id, player_profile_id,
         game_account_id, role, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (player_profile_id, competition_id)
       DO NOTHING
       RETURNING id, organization_id, competition_id, team_id, player_profile_id,
                 game_account_id, role, created_at`,
      [
        membership.id,
        membership.organizationId,
        membership.competitionId,
        membership.teamId,
        membership.playerProfileId,
        membership.gameAccountId,
        membership.role,
        membership.createdAt.toISOString(),
      ],
    );
    return result.rows[0] ? rehydrateRoster(result.rows[0]) : null;
  }

  async update(membership: CompetitionRosterMembership): Promise<CompetitionRosterMembership> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE competition_roster_memberships
       SET role = $2, game_account_id = $3
       WHERE id = $1 AND organization_id = $4 AND competition_id = $5 AND team_id = $6
       RETURNING id, organization_id, competition_id, team_id, player_profile_id,
                 game_account_id, role, created_at`,
      [
        membership.id,
        membership.role,
        membership.gameAccountId,
        membership.organizationId,
        membership.competitionId,
        membership.teamId,
      ],
    );
    return rehydrateRoster(result.rows[0]);
  }
}

export class PostgresActiveTeamPreferenceRepository implements ActiveTeamPreferenceRepository {
  constructor(private readonly pool: Pool) {}

  async findByActor(actorId: ActorId): Promise<ActiveTeamPreference | null> {
    const result = await this.pool.query(
      `SELECT actor_id, roster_membership_id, updated_at
       FROM active_team_preferences WHERE actor_id = $1`,
      [actorId],
    );
    return result.rows[0] ? rehydratePreference(result.rows[0]) : null;
  }

  async save(preference: ActiveTeamPreference): Promise<ActiveTeamPreference> {
    const result = await this.pool.query(
      `INSERT INTO active_team_preferences (actor_id, roster_membership_id, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (actor_id) DO UPDATE
       SET roster_membership_id = EXCLUDED.roster_membership_id,
           updated_at = EXCLUDED.updated_at
       RETURNING actor_id, roster_membership_id, updated_at`,
      [preference.actorId, preference.rosterMembershipId, preference.updatedAt.toISOString()],
    );
    return rehydratePreference(result.rows[0]);
  }
}

function rehydrateTeam(row: {
  id: string;
  organization_id: string;
  name: string;
  created_at: Date | string;
  created_by_actor_id: string;
  creation_key: string | null;
}): Team {
  return {
    id: asTeamId(row.id),
    organizationId: asOrganizationId(row.organization_id),
    name: row.name,
    createdAt: new Date(row.created_at),
    createdByActorId: asActorId(row.created_by_actor_id),
    creationKey: row.creation_key,
  };
}

function rehydrateRoster(row: {
  id: string;
  organization_id: string;
  competition_id: string;
  team_id: string;
  player_profile_id: string;
  game_account_id: string | null;
  role: string;
  created_at: Date | string;
}): CompetitionRosterMembership {
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    teamId: asTeamId(row.team_id),
    playerProfileId: row.player_profile_id,
    gameAccountId: row.game_account_id,
    role: row.role as RosterMembershipRole,
    createdAt: new Date(row.created_at),
  };
}

function rehydratePreference(row: {
  actor_id: string;
  roster_membership_id: string;
  updated_at: Date | string;
}): ActiveTeamPreference {
  return {
    actorId: asActorId(row.actor_id),
    rosterMembershipId: row.roster_membership_id,
    updatedAt: new Date(row.updated_at),
  };
}
