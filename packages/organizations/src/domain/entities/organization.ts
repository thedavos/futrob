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

/**
 * The fields a write may change. Only the fields present are written, so two concurrent writes
 * to different fields both survive instead of one restoring the other's stale value.
 */
export interface OrganizationChanges {
  readonly name?: string | undefined;
  readonly normalizedName?: string | undefined;
  readonly slug?: OrganizationSlug | undefined;
  readonly timeZone?: string | undefined;
  readonly logo?: OrganizationLogo | undefined;
}

export function normalizeOrganizationName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}
