import { escapeLike } from "@/adapters/persistence/pg-like.ts";
import {
  DISCOVERABLE_COMPETITION_STATUSES,
  type CompetitionDiscoveryFilter,
  type CompetitionDiscoveryReader,
  type DiscoverableCompetitionPage,
  type DiscoverableCompetitionRecord,
} from "@futrob/competitions";
import type { CompetitionId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import { pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { decodeDiscoveryCursor, encodeDiscoveryCursor } from "./discovery-cursor.ts";
import { rehydrateCompetition } from "./postgres.repository.ts";

const discoveryRowSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  name: z.string().min(1),
  status: z.string().min(1),
  modality: z.string().optional(),
  game_edition: z.string().min(1),
  platform: z.string().min(1),
  region: z.string().min(1),
  time_zone: z.string().min(1),
  format: z.string().min(1),
  created_by_actor_id: z.string().min(1),
  creation_key: z.string().nullish(),
  created_at: pgTimestampSchema,
  updated_at: pgTimestampSchema,
  max_teams: z.coerce.number().int().positive().nullish(),
  min_teams: z.coerce.number().int().positive().optional(),
  starts_on: z.union([z.date(), z.string()]).nullish(),
  ends_on: z.union([z.date(), z.string()]).nullish(),
  cover_kind: z.string().optional(),
  cover_value: z.string().optional(),
  cursor_updated_at: z.string(),
});

export class PostgresCompetitionDiscoveryReader implements CompetitionDiscoveryReader {
  constructor(private readonly pool: Pool) {}

  async list(filter: CompetitionDiscoveryFilter): Promise<DiscoverableCompetitionPage> {
    const statuses = filter.status ? [filter.status] : [...DISCOVERABLE_COMPETITION_STATUSES];
    const cursor = decodeDiscoveryCursor(filter.cursor, filter.sort);
    const values: unknown[] = [statuses];
    const clauses = ["c.status = ANY($1)"];

    if (filter.q) {
      values.push(`%${escapeLike(filter.q)}%`);
      clauses.push(`c.name ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (filter.format) {
      values.push(filter.format);
      clauses.push(`c.format = $${values.length}`);
    }
    if (filter.region) {
      values.push(filter.region);
      clauses.push(`c.region = $${values.length}`);
    }
    if (filter.platform) {
      values.push(filter.platform);
      clauses.push(`c.platform = $${values.length}`);
    }
    const matchingWhere = clauses.join(" AND ");
    const cursorClauses: string[] = [];
    if (cursor?.sort === "updated-desc") {
      values.push(cursor.updatedAt, cursor.id);
      cursorClauses.push(
        `(c.updated_at, c.id) < ($${values.length - 1}::timestamptz, $${values.length})`,
      );
    }
    if (cursor?.sort === "name-asc") {
      values.push(cursor.name, cursor.id);
      cursorClauses.push(
        `(lower(c.name), c.id) > (lower($${values.length - 1}), $${values.length})`,
      );
    }

    values.push(filter.limit + 1);
    const orderBy =
      filter.sort === "name-asc" ? "lower(c.name) ASC, c.id ASC" : "c.updated_at DESC, c.id DESC";
    const result = await getPgExecutor(this.pool).query(
      `WITH matching AS NOT MATERIALIZED (
         SELECT c.* FROM competitions c WHERE ${matchingWhere}
       ), page AS MATERIALIZED (
         SELECT c.*,
                to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
                  AS cursor_updated_at
         FROM matching c
         ${cursorClauses.length ? `WHERE ${cursorClauses.join(" AND ")}` : ""}
         ORDER BY ${orderBy}
         LIMIT $${values.length}
       ), total AS (
         SELECT COUNT(*)::int AS total FROM matching
       )
       SELECT row_to_json(c) AS competition, total.total,
              (SELECT COUNT(*)::int FROM competition_entries e
               WHERE e.organization_id = c.organization_id
                 AND e.competition_id = c.id AND e.status = 'approved') AS approved_team_count
       FROM total LEFT JOIN page c ON true
       ORDER BY ${orderBy}`,
      values,
    );
    const resultRows = z
      .array(
        z.object({
          competition: discoveryRowSchema.nullable(),
          total: z.coerce.number().int().nonnegative(),
          approved_team_count: z.coerce.number().int().nonnegative(),
        }),
      )
      .parse(result.rows);
    const rows = resultRows.flatMap((row) =>
      row.competition ? [{ ...row.competition, approved_team_count: row.approved_team_count }] : [],
    );
    const page = rows.slice(0, filter.limit);
    const last = page.at(-1);
    return {
      items: page.map((row) => ({
        competition: rehydrateCompetition({
          ...row,
          creation_key: row.creation_key ?? null,
        }),
        approvedTeamCount: Number(row.approved_team_count),
      })),
      total: resultRows[0]?.total ?? 0,
      nextCursor:
        rows.length > filter.limit && last
          ? encodeDiscoveryCursor(
              filter.sort === "name-asc"
                ? { sort: "name-asc", name: last.name, id: last.id }
                : {
                    sort: "updated-desc",
                    updatedAt: last.cursor_updated_at,
                    id: last.id,
                  },
            )
          : null,
    };
  }

  async findById(competitionId: CompetitionId): Promise<DiscoverableCompetitionRecord | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT c.id, c.organization_id, c.name, c.status, c.modality, c.game_edition, c.platform,
              c.region, c.time_zone, c.format, c.created_by_actor_id, c.creation_key,
              c.created_at, c.updated_at, c.min_teams, c.max_teams,
              c.starts_on, c.ends_on, c.cover_kind, c.cover_value,
              to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
                AS cursor_updated_at,
              (SELECT COUNT(*)::int FROM competition_entries e
               WHERE e.organization_id = c.organization_id
                 AND e.competition_id = c.id AND e.status = 'approved') AS approved_team_count
       FROM competitions c
       WHERE c.id = $1 AND c.status = ANY($2)`,
      [competitionId, [...DISCOVERABLE_COMPETITION_STATUSES]],
    );
    const row = result.rows[0]
      ? discoveryRowSchema
          .extend({
            approved_team_count: z.coerce.number().int().nonnegative(),
          })
          .parse(result.rows[0])
      : undefined;
    if (!row) return null;
    return {
      competition: rehydrateCompetition({
        ...row,
        creation_key: row.creation_key ?? null,
      }),
      approvedTeamCount: Number(row.approved_team_count),
    };
  }
}
