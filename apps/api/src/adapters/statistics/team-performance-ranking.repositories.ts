import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import {
  TEAM_PERFORMANCE_FORMULA_VERSION,
  TEAM_PERFORMANCE_NORMALIZATION_VERSION,
  TEAM_PERFORMANCE_WINDOW_VERSION,
  type TeamPerformanceRankingRepository,
  type TeamPerformanceRankingSnapshot,
  type TeamPerformanceScope,
} from "@futrob/statistics";
import { teamPerformanceRankingSnapshotSchema } from "@futrob/api-contracts";
import type { Pool } from "pg";
import { parseJsonColumn } from "@/adapters/persistence/parse-json-column.ts";
import { getPgExecutor, isInPgTransaction } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryTeamPerformanceRankingRepository implements TeamPerformanceRankingRepository {
  private readonly rows = new Map<string, TeamPerformanceRankingSnapshot>();
  async find(scope: TeamPerformanceScope): Promise<TeamPerformanceRankingSnapshot | null> {
    return structuredClone(this.rows.get(key(scope)) ?? null);
  }
  async replace(
    snapshot: TeamPerformanceRankingSnapshot,
    expectedFingerprint: string | null,
  ): Promise<boolean> {
    const previous = this.rows.get(key(snapshot));
    if ((previous?.revisionFingerprint ?? null) !== expectedFingerprint) return false;
    this.rows.set(key(snapshot), structuredClone(snapshot));
    return true;
  }
}

export class PostgresTeamPerformanceRankingRepository implements TeamPerformanceRankingRepository {
  constructor(private readonly pool: Pool) {}
  async find(scope: TeamPerformanceScope): Promise<TeamPerformanceRankingSnapshot | null> {
    const result = await getPgExecutor(this.pool).query<{ snapshot: string }>(
      `SELECT snapshot FROM team_performance_ranking_snapshots WHERE organization_id = $1 AND competition_id = $2 AND formula_version = $3 AND normalization_version = $4 AND window_version = $5`,
      [
        scope.organizationId,
        scope.competitionId,
        TEAM_PERFORMANCE_FORMULA_VERSION,
        TEAM_PERFORMANCE_NORMALIZATION_VERSION,
        TEAM_PERFORMANCE_WINDOW_VERSION,
      ],
    );
    const row = result.rows[0];
    if (!row) return null;
    const parsed = parseJsonColumn(teamPerformanceRankingSnapshotSchema, row.snapshot);
    return {
      ...parsed,
      organizationId: asOrganizationId(parsed.organizationId),
      competitionId: asCompetitionId(parsed.competitionId),
      rows: parsed.rows.map((ranking) => ({ ...ranking, teamId: asTeamId(ranking.teamId) })),
      updatedAt: new Date(parsed.updatedAt),
    };
  }
  async replace(
    snapshot: TeamPerformanceRankingSnapshot,
    expectedFingerprint: string | null,
  ): Promise<boolean> {
    if (!isInPgTransaction())
      throw new Error("Team performance replacement requires a Postgres transaction.");
    const payload = teamPerformanceRankingSnapshotSchema.parse({
      ...snapshot,
      updatedAt: snapshot.updatedAt.toISOString(),
    });
    const executor = getPgExecutor(this.pool);
    const parameters = [
      snapshot.organizationId,
      snapshot.competitionId,
      snapshot.formulaVersion,
      snapshot.normalizationVersion,
      snapshot.windowVersion,
      snapshot.revisionFingerprint,
      JSON.stringify(payload),
      snapshot.updatedAt.toISOString(),
    ];
    if (expectedFingerprint === null) {
      const result = await executor.query(
        `INSERT INTO team_performance_ranking_snapshots (organization_id, competition_id, formula_version, normalization_version, window_version, revision_fingerprint, snapshot, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) ON CONFLICT DO NOTHING`,
        parameters,
      );
      return result.rowCount === 1;
    }
    const result = await executor.query(
      `UPDATE team_performance_ranking_snapshots SET revision_fingerprint = $6, snapshot = $7::jsonb, updated_at = $8 WHERE organization_id = $1 AND competition_id = $2 AND formula_version = $3 AND normalization_version = $4 AND window_version = $5 AND revision_fingerprint = $9`,
      [...parameters, expectedFingerprint],
    );
    return result.rowCount === 1;
  }
}

function key(scope: TeamPerformanceScope): string {
  return JSON.stringify([
    scope.organizationId,
    scope.competitionId,
    TEAM_PERFORMANCE_FORMULA_VERSION,
    TEAM_PERFORMANCE_NORMALIZATION_VERSION,
    TEAM_PERFORMANCE_WINDOW_VERSION,
  ]);
}
