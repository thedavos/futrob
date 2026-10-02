import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type { OrganizationLogo } from "../value-objects/organization-logo.ts";
import type { OrganizationSlug } from "../value-objects/organization-slug.ts";

export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly normalizedName: string;
  readonly slug: OrganizationSlug;
  /** IANA zone; the initial value for the organization's new competitions. */
  readonly timeZone: string;
  readonly logo: OrganizationLogo;
  readonly createdAt: Date;
  readonly createdByActorId: ActorId;
  readonly creationKey?: string;
}

export function normalizeOrganizationName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}
