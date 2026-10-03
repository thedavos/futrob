import type { OrganizationId } from "@futrob/shared-kernel";

declare const organizationLogoKeyBrand: unique symbol;

/** R2 object key owned by one organization, e.g. `organization-logos/{orgId}/{name}.png`. */
export type OrganizationLogoKey = string & { readonly [organizationLogoKeyBrand]: true };

/** `monogram` is rendered from the organization name; only uploads reference storage. */
export type OrganizationLogo =
  | { readonly kind: "monogram" }
  | { readonly kind: "upload"; readonly key: OrganizationLogoKey };

export type OrganizationLogoInput =
  | { readonly kind: "monogram" }
  | { readonly kind: "upload"; readonly key: string };

export const DEFAULT_ORGANIZATION_LOGO: OrganizationLogo = { kind: "monogram" };

export function organizationLogoKeyPrefix(organizationId: OrganizationId): string {
  return `organization-logos/${organizationId}/`;
}

const OBJECT_NAME = /^[A-Za-z0-9_-]{1,120}\.(png|jpg|webp)$/;

/** Accepts an uploaded key only inside the organization's logo prefix. */
export function parseOrganizationLogo(
  input: OrganizationLogoInput,
  organizationId: OrganizationId,
): OrganizationLogo | null {
  if (input.kind === "monogram") return DEFAULT_ORGANIZATION_LOGO;
  const prefix = organizationLogoKeyPrefix(organizationId);
  if (!input.key.startsWith(prefix)) return null;
  if (!OBJECT_NAME.test(input.key.slice(prefix.length))) return null;
  // SAFETY: the key sits under this organization's prefix with a safe object name.
  return { kind: "upload", key: input.key as OrganizationLogoKey };
}
