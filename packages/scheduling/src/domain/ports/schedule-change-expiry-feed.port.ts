import type { EncounterId, OrganizationId } from "@futrob/shared-kernel";

export interface DueScheduleChangeRequest {
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly requestId: string;
}

export interface ScheduleChangeExpiryFeedPort {
  listDue(input: {
    readonly dueAt: Date;
    readonly limit: number;
  }): Promise<readonly DueScheduleChangeRequest[]>;
}
