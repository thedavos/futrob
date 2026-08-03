import type { ActorId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export interface Team {
  readonly id: TeamId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly createdAt: Date;
  readonly createdByActorId: ActorId;
  readonly creationKey: string | null;
}
