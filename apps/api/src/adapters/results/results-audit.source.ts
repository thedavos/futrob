import type {
  OrganizationAuditReadQuery,
  OrganizationAuditSourcePort,
} from "@futrob/organizations";
import { redactOptionalAuditReason } from "@futrob/results";
import type { Pool } from "pg";
import { PostgresAuditSource } from "@/adapters/persistence/postgres-audit-source.ts";

const RESULTS_AUDIT_SQL = `
  SELECT '70:result:' || lpad(seq::text, 20, '0') || ':' || id AS id,
    organization_id, competition_id, actor_id, 'results.' || action_type AS action,
    reason, occurred_at, command_key AS request_id, 'encounter'::text AS object_type,
    encounter_id AS object_id, NULL::text AS object_label, NULL::text AS object_href
  FROM official_selection_actions
`;

export class ResultsAuditSource implements OrganizationAuditSourcePort {
  private readonly source: PostgresAuditSource;

  constructor(pool: Pool) {
    this.source = new PostgresAuditSource(pool, RESULTS_AUDIT_SQL);
  }

  async read(query: OrganizationAuditReadQuery) {
    const entries = await this.source.read(query);
    return entries.map((entry) => ({ ...entry, reason: redactOptionalAuditReason(entry.reason) }));
  }
}
