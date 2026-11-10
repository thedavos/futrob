import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";

export interface OrganizationAuditEntry {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId | null;
  readonly actorId: ActorId | null;
  readonly actorName: string | null;
  readonly action: string;
  readonly reason: string | null;
  readonly occurredAt: Date;
  readonly requestId: string | null;
  readonly object: {
    readonly type: string;
    readonly id: string;
    readonly label: string | null;
    readonly href: string | null;
  };
}

export interface OrganizationAuditCursor {
  readonly occurredAt: Date;
  readonly id: string;
}

export interface OrganizationAuditQuery {
  readonly organizationId: OrganizationId;
  readonly competitionId?: CompetitionId;
  readonly actorId?: ActorId;
  readonly action?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly cursor?: OrganizationAuditCursor;
  readonly limit: number;
}

export interface OrganizationAuditPage {
  readonly entries: readonly OrganizationAuditEntry[];
  readonly nextCursor: OrganizationAuditCursor | null;
}

export interface OrganizationAuditReaderPort {
  read(query: OrganizationAuditQuery): Promise<OrganizationAuditPage>;
}

export interface OrganizationAuditSourcePort {
  read(query: OrganizationAuditQuery): Promise<readonly OrganizationAuditEntry[]>;
}

export type OrganizationOperationAuditEntry = Omit<OrganizationAuditEntry, "actorName">;

export interface OrganizationOperationAuditRepository {
  append(entry: OrganizationOperationAuditEntry): Promise<void>;
}
