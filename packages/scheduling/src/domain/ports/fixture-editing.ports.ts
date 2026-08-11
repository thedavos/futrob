import type { ActorId, CompetitionId, EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type { FixtureEncounter, FixturePlan } from "../entities/fixture-plan.ts";

export interface EditableFixturePlanRepository {
  findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    fixturePlanId: string,
  ): Promise<FixturePlan | null>;
  update(plan: FixturePlan): Promise<FixturePlan | null>;
}

export interface FixtureEncounterEditGuardPort {
  canEdit(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly encounterId: EncounterId;
  }): Promise<boolean>;
}

export interface FixtureEncounterOwnershipPort {
  containsEncounter(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly encounterId: EncounterId;
  }): Promise<boolean>;
}

export interface FixtureAuditEntry {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly fixturePlanId: string;
  readonly encounterId: EncounterId;
  readonly actorId: ActorId;
  readonly requestId: string;
  readonly reason: string;
  readonly occurredAt: Date;
  readonly before: FixtureEncounter;
  readonly after: FixtureEncounter;
}

export interface FixtureAuditPort {
  findByRequestId(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    requestId: string,
  ): Promise<FixtureAuditEntry | null>;
  append(entry: FixtureAuditEntry): Promise<void>;
}
