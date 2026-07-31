import type { ActorId, OrganizationId } from "@futrob/shared-kernel";

export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly normalizedName: string;
  readonly createdAt: Date;
  readonly createdByActorId: ActorId;
  readonly creationKey?: string;
}

export function normalizeOrganizationName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}
