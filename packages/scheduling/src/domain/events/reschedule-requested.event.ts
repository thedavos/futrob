import type {
  ActorId,
  CompetitionId,
  DomainEvent,
  EncounterId,
  OrganizationId,
  TeamId,
} from "@futrob/shared-kernel";
import type { RescheduleScope } from "../value-objects/reschedule-scope.ts";

export type RescheduleRequestedEvent = DomainEvent<
  "scheduling.reschedule-requested",
  {
    readonly requestId: string;
    readonly proposalId: string;
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly encounterId: EncounterId;
    readonly requestingTeamId: TeamId;
    readonly scope: RescheduleScope;
    readonly proposedStartAt: string;
    readonly initiatedByActorId: ActorId;
  }
>;
