import type { DomainEvent } from "@futrob/shared-kernel";

export type OfficialResultApprovedEvent = DomainEvent<
  "results.official-result-approved",
  {
    readonly encounterId: string;
    readonly organizationId: string;
    readonly competitionId: string;
    readonly approvedBy: string;
    readonly officialResultId: string;
    readonly revision: number;
  }
>;
