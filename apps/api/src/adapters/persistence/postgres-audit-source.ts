import type {
  OrganizationAuditEntry,
  OrganizationAuditReadQuery,
  OrganizationAuditSourcePort,
} from "@futrob/organizations";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { auditObjectHref } from "@/application/organizations/audit-object-href.ts";
import { getPgExecutor } from "./pg-transaction.ts";

const rowSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  competition_id: z.string().nullable(),
  actor_id: z.string().nullable(),
  action: z.string(),
  reason: z.string().nullable(),
  occurred_at: z.date(),
  request_id: z.string().nullable(),
  object_type: z.string(),
  object_id: z.string(),
  object_label: z.string().nullable(),
  object_href: z.string().nullable(),
});

export class PostgresAuditSource implements OrganizationAuditSourcePort {
  constructor(
    private readonly pool: Pool,
    private readonly sourceQuery: string,
  ) {}

  async read(query: OrganizationAuditReadQuery): Promise<readonly OrganizationAuditEntry[]> {
    const rows = await getPgExecutor(this.pool).query(
      `SELECT * FROM (SELECT id, organization_id, competition_id, actor_id, action, reason, date_trunc('milliseconds', occurred_at) AS occurred_at, request_id, object_type, object_id, object_label, object_href FROM (${this.sourceQuery}) AS raw_audit) AS audit
      WHERE organization_id = $1
      AND ($2::text IS NULL OR competition_id = $2)
      AND (competition_id IS NULL OR competition_id = ANY($10::text[]))
      AND ($3::text IS NULL OR actor_id = $3)
      AND ($4::text IS NULL OR action = $4)
      AND ($5::timestamptz IS NULL OR occurred_at >= $5)
      AND ($6::timestamptz IS NULL OR occurred_at <= $6)
      AND ($7::timestamptz IS NULL OR (occurred_at, id COLLATE "C") < ($7, $8 COLLATE "C"))
      ORDER BY occurred_at DESC, id COLLATE "C" DESC LIMIT $9`,
      [
        query.organizationId,
        query.competitionId ?? null,
        query.actorId ?? null,
        query.action ?? null,
        query.from ?? null,
        query.to ?? null,
        query.cursor?.occurredAt ?? null,
        query.cursor?.id ?? null,
        query.limit + 1,
        query.accessibleCompetitionIds,
      ],
    );
    return rows.rows.map((raw) => {
      const row = rowSchema.parse(raw);
      const entry = {
        id: row.id,
        organizationId: asOrganizationId(row.organization_id),
        competitionId: row.competition_id ? asCompetitionId(row.competition_id) : null,
        actorId: row.actor_id ? asActorId(row.actor_id) : null,
        actorName: null,
        action: row.action,
        reason: row.reason,
        occurredAt: row.occurred_at,
        requestId: row.request_id,
        object: {
          type: row.object_type,
          id: row.object_id,
          label: row.object_label,
          href: row.object_href,
        },
      };
      return { ...entry, object: { ...entry.object, href: auditObjectHref(entry) } };
    });
  }
}
