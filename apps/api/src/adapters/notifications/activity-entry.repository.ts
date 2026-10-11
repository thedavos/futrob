import {
  ACTIVITY_STATUS,
  type ActivityEntry,
  type ActivityEntryRepository,
  type ActivityQuery,
  type CloseActivityCommand,
} from "@futrob/notifications";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import {
  pgNullableTextSchema,
  pgTextSchema,
  pgTimestampSchema,
} from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const COLUMNS = `id, organization_id, competition_id, audience, audience_id, kind, status,
  requires_action, resource_type, resource_id, subject, actor_id, closed_by_actor_id,
  opened_at, closed_at, expires_at, last_event_at, source_name, source_id`;

const subjectSchema = z
  .object({
    competitionName: z.string().nullish(),
    encounterLabel: z.string().nullish(),
    teamName: z.string().nullish(),
  })
  .transform((subject) => ({
    competitionName: subject.competitionName ?? null,
    encounterLabel: subject.encounterLabel ?? null,
    teamName: subject.teamName ?? null,
  }));

const nullableTimestampSchema = z.union([z.null(), pgTimestampSchema]);

const activityRowSchema = z.object({
  id: pgTextSchema,
  organization_id: pgTextSchema,
  competition_id: pgNullableTextSchema,
  audience: z.enum(["organization", "team", "actor"]),
  audience_id: pgTextSchema,
  kind: z.enum([
    "match_dispute",
    "selection_confirmation",
    "roster_invitation",
    "competition_published",
  ]),
  status: z.enum(["open", "closed"]),
  requires_action: z.boolean(),
  resource_type: z.enum(["encounter", "roster_invitation", "competition"]),
  resource_id: pgTextSchema,
  subject: subjectSchema,
  actor_id: pgTextSchema,
  closed_by_actor_id: pgNullableTextSchema,
  opened_at: pgTimestampSchema,
  closed_at: nullableTimestampSchema,
  expires_at: nullableTimestampSchema,
  last_event_at: pgTimestampSchema,
  source_name: z.enum(["match_dispute", "proposal", "roster_invitation", "competition"]),
  source_id: pgTextSchema,
});

type ActivityRow = z.infer<typeof activityRowSchema>;
type QueryValue = string | number | boolean | Date | readonly string[];

function toEntry(parsed: ActivityRow): ActivityEntry {
  return {
    id: parsed.id,
    organizationId: asOrganizationId(parsed.organization_id),
    competitionId: parsed.competition_id ? asCompetitionId(parsed.competition_id) : null,
    audience: parsed.audience,
    audienceId: parsed.audience_id,
    kind: parsed.kind,
    status: parsed.status,
    requiresAction: parsed.requires_action,
    resourceType: parsed.resource_type,
    resourceId: parsed.resource_id,
    subject: parsed.subject,
    actorId: asActorId(parsed.actor_id),
    closedByActorId: parsed.closed_by_actor_id ? asActorId(parsed.closed_by_actor_id) : null,
    openedAt: parsed.opened_at,
    closedAt: parsed.closed_at,
    expiresAt: parsed.expires_at,
    lastEventAt: parsed.last_event_at,
    sourceName: parsed.source_name,
    sourceId: parsed.source_id,
  };
}

export class PostgresActivityEntryRepository implements ActivityEntryRepository {
  constructor(private readonly pool: Pool) {}

  async insertIfAbsent(entries: readonly ActivityEntry[]): Promise<readonly ActivityEntry[]> {
    const executor = getPgExecutor(this.pool);
    const stored: ActivityEntry[] = [];
    for (const entry of entries) {
      const inserted = await executor.query(
        `INSERT INTO activity_entries (${COLUMNS})
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16,
                 $17, $18, $19)
         ON CONFLICT (source_name, source_id, audience, audience_id) DO NOTHING
         RETURNING ${COLUMNS}`,
        [
          entry.id,
          entry.organizationId,
          entry.competitionId,
          entry.audience,
          entry.audienceId,
          entry.kind,
          entry.status,
          entry.requiresAction,
          entry.resourceType,
          entry.resourceId,
          JSON.stringify(entry.subject),
          entry.actorId,
          entry.closedByActorId,
          entry.openedAt,
          entry.closedAt,
          entry.expiresAt,
          entry.lastEventAt,
          entry.sourceName,
          entry.sourceId,
        ],
      );
      if (inserted.rows[0]) {
        stored.push(toEntry(activityRowSchema.parse(inserted.rows[0])));
        continue;
      }
      const existing = await executor.query(
        `SELECT ${COLUMNS} FROM activity_entries
         WHERE source_name = $1 AND source_id = $2 AND audience = $3 AND audience_id = $4`,
        [entry.sourceName, entry.sourceId, entry.audience, entry.audienceId],
      );
      stored.push(toEntry(activityRowSchema.parse(existing.rows[0])));
    }
    return stored;
  }

  async close(command: CloseActivityCommand): Promise<number> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE activity_entries
       SET status = 'closed', closed_at = $3, last_event_at = $3, closed_by_actor_id = $4
       WHERE source_name = $1 AND source_id = $2 AND status = 'open'
         AND ($5::text IS NULL OR (audience = $5 AND audience_id = $6))`,
      [
        command.source.name,
        command.source.id,
        command.closedAt,
        command.closedByActorId,
        command.audience?.audience ?? null,
        command.audience?.audienceId ?? null,
      ],
    );
    return result.rowCount ?? 0;
  }

  async list(query: ActivityQuery): Promise<readonly ActivityEntry[]> {
    const params: QueryValue[] = [
      query.audiences.map((ref) => ref.audience),
      query.audiences.map((ref) => ref.audienceId),
      query.audiences.map((ref) => ref.competitionId ?? ""),
    ];
    // An empty competition means the audience is not narrowed to one competition.
    const where = [
      `EXISTS (
         SELECT 1 FROM unnest($1::text[], $2::text[], $3::text[])
           AS scope (audience, audience_id, competition_id)
         WHERE scope.audience = activity_entries.audience
           AND scope.audience_id = activity_entries.audience_id
           AND (scope.competition_id = '' OR scope.competition_id = activity_entries.competition_id)
       )`,
    ];
    const bind = (value: QueryValue) => {
      params.push(value);
      return `$${params.length}`;
    };
    if (query.organizationId !== undefined) {
      where.push(`organization_id = ${bind(query.organizationId)}`);
    }
    if (query.competitionId !== undefined) {
      where.push(`competition_id = ${bind(query.competitionId)}`);
    }
    if (query.status !== undefined) where.push(`status = ${bind(query.status)}`);
    if (query.requiresAction !== undefined) {
      where.push(`requires_action = ${bind(query.requiresAction)}`);
    }
    if (query.status === ACTIVITY_STATUS.open) {
      where.push(`(expires_at IS NULL OR expires_at > ${bind(query.now)})`);
    }
    if (query.after) {
      where.push(
        `(last_event_at, id COLLATE "C") < (${bind(query.after.lastEventAt)}::timestamptz, ${bind(query.after.id)}::text COLLATE "C")`,
      );
    }
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${COLUMNS} FROM activity_entries
       WHERE ${where.join(" AND ")}
       ORDER BY last_event_at DESC, id COLLATE "C" DESC
       LIMIT ${bind(query.limit)}`,
      params,
    );
    return result.rows.map((row) => toEntry(activityRowSchema.parse(row)));
  }
}
