import type { OrganizationInvitation } from "../entities/organization-invitation.ts";

export interface InvitationRepository {
  create(invitation: OrganizationInvitation): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null>;
  update(invitation: OrganizationInvitation): Promise<void>;
}
