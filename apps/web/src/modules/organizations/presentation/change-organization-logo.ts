import type { OrganizationProfileDto } from "@futrob/api-contracts";
import { organizationsBrowserClient } from "./organizations-browser-client.ts";

/**
 * Stores `file` under the organization's logo prefix and registers its key, or goes back to the
 * monogram when `file` is `null`. The logo only changes once both steps succeed.
 */
export async function changeOrganizationLogo(
  organizationId: string,
  file: File | null,
): Promise<OrganizationProfileDto> {
  if (file === null) {
    return organizationsBrowserClient.setLogo(organizationId, { logo: { kind: "monogram" } });
  }
  const { key } = await organizationsBrowserClient.uploadLogo(
    organizationId,
    crypto.randomUUID(),
    file,
  );
  return organizationsBrowserClient.setLogo(organizationId, { logo: { kind: "upload", key } });
}
