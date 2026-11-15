import type {
  OrganizationAuditReadQuery,
  OrganizationAuditSourcePort,
  OrganizationOperationAuditEntry,
  OrganizationOperationAuditRepository,
} from "@futrob/organizations";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import { filterAuditEntries } from "@/application/organizations/unified-organization-audit.reader.ts";

export class PostgresOperationAuditRepository implements OrganizationOperationAuditRepository {
  constructor(private readonly pool: Pool) {}
  async append(entry: OrganizationOperationAuditEntry): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO organization_operation_audit (
      id,organization_id,competition_id,actor_id,action,reason,occurred_at,request_id,object_type,object_id,object_label
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
      [
        entry.id,
        entry.organizationId,
        entry.competitionId,
        entry.actorId,
        entry.action,
        entry.reason,
        entry.occurredAt,
        entry.requestId,
        entry.object.type,
        entry.object.id,
        entry.object.label,
      ],
    );
  }
}

export class InMemoryOperationAuditRepository
  implements OrganizationOperationAuditRepository, OrganizationAuditSourcePort
{
  private readonly rows: OrganizationOperationAuditEntry[] = [];
  async append(entry: OrganizationOperationAuditEntry): Promise<void> {
    if (!this.rows.some((row) => row.id === entry.id)) this.rows.push(entry);
  }
  async read(query: OrganizationAuditReadQuery) {
    return filterAuditEntries(
      this.rows.map((entry) => ({ ...entry, id: `60:operation:${entry.id}`, actorName: null })),
      query,
    );
  }
}
