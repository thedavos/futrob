import type { ActorId, OrganizationId } from "@futrob/shared-kernel";

export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly createdAt: Date;
  readonly createdByActorId: ActorId;
}
