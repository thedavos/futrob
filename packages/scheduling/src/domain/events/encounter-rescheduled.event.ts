import type { DomainEvent } from "@futrob/shared-kernel";
import type { RescheduleScope } from "../value-objects/reschedule-scope.ts";

export type EncounterRescheduledEvent = DomainEvent<
  "scheduling.encounter-rescheduled",
  {
    readonly encounterId: string;
    readonly previousStartAt: string;
    readonly newStartAt: string;
    readonly scope: RescheduleScope;
    readonly approvedBy: string;
  }
>;
