import {
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type CompetitionId,
  type OrganizationId,
  type TeamId,
} from "@futrob/shared-kernel";
import {
  resolveMaxRosterSize,
  type CompetitionRosterState,
  type CompetitionRosterStateRepository,
  type RosterCapacityPort,
} from "@futrob/teams";
import type { CompetitionRepository } from "@futrob/competitions";
import type { Pool } from "pg";

export class InMemoryCompetitionRosterStateRepository implements CompetitionRosterStateRepository {
  readonly rows = new Map<string, CompetitionRosterState>();

  private key(organizationId: OrganizationId, competitionId: CompetitionId, teamId: TeamId) {
    return `${organizationId}:${competitionId}:${teamId}`;
  }

  async get(organizationId: OrganizationId, competitionId: CompetitionId, teamId: TeamId) {
    return this.rows.get(this.key(organizationId, competitionId, teamId)) ?? null;
  }

  async save(state: CompetitionRosterState) {
    this.rows.set(this.key(state.organizationId, state.competitionId, state.teamId), state);
    return state;
  }
}

export class PostgresCompetitionRosterStateRepository implements CompetitionRosterStateRepository {
  constructor(private readonly pool: Pool) {}

  async get(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<CompetitionRosterState | null> {
    const result = await this.pool.query(
      `SELECT organization_id, competition_id, team_id, locked_at
       FROM competition_roster_states
       WHERE organization_id = $1 AND competition_id = $2 AND team_id = $3`,
      [organizationId, competitionId, teamId],
    );
    return result.rows[0] ? rehydrate(result.rows[0]) : null;
  }

  async save(state: CompetitionRosterState): Promise<CompetitionRosterState> {
    const result = await this.pool.query(
      `INSERT INTO competition_roster_states (
         organization_id, competition_id, team_id, locked_at
       ) VALUES ($1, $2, $3, $4)
       ON CONFLICT (competition_id, team_id) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         locked_at = EXCLUDED.locked_at
       RETURNING organization_id, competition_id, team_id, locked_at`,
      [
        state.organizationId,
        state.competitionId,
        state.teamId,
        state.lockedAt?.toISOString() ?? null,
      ],
    );
    return rehydrate(result.rows[0]);
  }
}

export class CompetitionRulesRosterCapacityPort implements RosterCapacityPort {
  constructor(private readonly competitions: CompetitionRepository) {}

  async getMaxRosterSize(competitionId: CompetitionId): Promise<number> {
    const rules = await this.competitions.findRulesByCompetitionId(competitionId);
    return resolveMaxRosterSize(rules?.maxRosterSize ?? null);
  }
}

function rehydrate(row: {
  organization_id: string;
  competition_id: string;
  team_id: string;
  locked_at: Date | string | null;
}): CompetitionRosterState {
  return {
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    teamId: asTeamId(row.team_id),
    lockedAt: row.locked_at ? new Date(row.locked_at) : null,
  };
}
