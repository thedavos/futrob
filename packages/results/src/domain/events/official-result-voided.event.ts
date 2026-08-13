import type { DomainEvent } from "@futrob/shared-kernel";

export type OfficialResultVoidedEvent = DomainEvent<
  "results.official-result-voided",
  {
    readonly encounterId: string;
    readonly organizationId: string;
    readonly competitionId: string;
    readonly voidedBy: string;
    readonly officialResultId: string;
    readonly revision: number;
  }
>;
