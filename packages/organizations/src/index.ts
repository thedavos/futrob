export { normalizeOrganizationName, type Organization } from "./domain/entities/organization.ts";
export {
  INVITATION_STATUS,
  REDEEM_POLICY,
  type InvitationStatus,
  type OrganizationInvitation,
  type RedeemPolicy,
} from "./domain/entities/organization-invitation.ts";
export type { OrganizationMembership } from "./domain/entities/organization-membership.ts";
export type {
  AccessGrant,
  AuthorizationAuditEntry,
  GrantEffect,
  PlatformRoleAssignment,
} from "./domain/entities/access-grant.ts";

export type {
  CompetitionInviteRole,
  InviteRole,
  OrgMembershipRole,
  OrganizationInviteRole,
} from "./domain/value-objects/organization-membership-role.ts";
export {
  isCompetitionInviteRole,
  isInviteRole,
  isOrganizationInviteRole,
} from "./domain/value-objects/organization-membership-role.ts";
export {
  ORGANIZATION_PERMISSION,
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLE_PERMISSIONS,
} from "./domain/policies/organization-permissions.ts";
export type {
  MembershipSummary,
  PostAuthDestination,
} from "./domain/value-objects/post-auth-destination.ts";

export type {
  InvitationRepository,
  MultiRedemptionClaim,
} from "./domain/ports/invitation.repository.ts";
export type { InvitationTokenPort } from "./domain/ports/invitation-token.port.ts";
export type { MembershipRepository } from "./domain/ports/membership.repository.ts";
export type { OrganizationRepository } from "./domain/ports/organization.repository.ts";
export type {
  AccessGrantRepository,
  AuthorizationAuditRepository,
  PlatformRoleRepository,
} from "./domain/ports/access-grant.repository.ts";

export {
  InvitationNotFound,
  InvitationInvalid,
  InvitationExpired,
  InvitationRevoked,
  InvitationExhausted,
  OrganizationNotFound,
  OrganizationForbidden,
  InvalidInvitationRole,
  InvalidInvitationRedeemPolicy,
  type AcceptInvitationError,
  type CreateInvitationError,
} from "./domain/errors/invitation.errors.ts";

export {
  InvalidOrganizationName,
  OrganizationNameConflict,
  type CreateOrganizationError,
} from "./domain/errors/organization.errors.ts";
export {
  AccessGrantNotFound,
  AuthorizationForbidden,
  AuthorizationScopeNotFound,
  LastSuperuserProtected,
  PlatformRoleNotFound,
  LastOrganizerProtected,
  OrganizationMembershipNotFound,
  type ManageAccessGrantError,
  type ManageOrganizationRoleError,
  type ManageSuperuserError,
} from "./domain/errors/authorization.errors.ts";

export {
  CreateOrganizationUseCase,
  type CreateOrganizationInput,
  type CreateOrganizationResult,
} from "./application/create-organization/create-organization.use-case.ts";
export {
  CheckOrganizationNameUseCase,
  type CheckOrganizationNameInput,
  type CheckOrganizationNameResult,
} from "./application/check-organization-name/check-organization-name.use-case.ts";
export {
  ListMembershipsForActorUseCase,
  type ListMembershipsForActorInput,
} from "./application/list-memberships-for-actor/list-memberships-for-actor.use-case.ts";
export {
  CreateInvitationUseCase,
  type CreateInvitationInput,
  type CreateInvitationResult,
} from "./application/create-invitation/create-invitation.use-case.ts";
export {
  AcceptInvitationUseCase,
  type AcceptInvitationInput,
  type AcceptedInvitation,
} from "./application/accept-invitation/accept-invitation.use-case.ts";
export {
  InspectCompetitionInvitationUseCase,
  type InspectCompetitionInvitationInput,
  type InspectedCompetitionInvitation,
} from "./application/inspect-competition-invitation/inspect-competition-invitation.use-case.ts";
export { resolvePostAuthDestination } from "./application/resolve-post-auth-destination/resolve-post-auth-destination.ts";
export {
  GetEffectiveAccessUseCase,
  type GetEffectiveAccessInput,
} from "./application/get-effective-access/get-effective-access.use-case.ts";
export { RequirePermissionUseCase } from "./application/require-permission/require-permission.use-case.ts";
export {
  DeleteAccessGrantUseCase,
  ListAccessGrantsUseCase,
  UpsertAccessGrantUseCase,
  type UpsertAccessGrantInput,
} from "./application/manage-access-grant/manage-access-grant.use-case.ts";
export {
  AssignSuperuserUseCase,
  ChangeOrganizationRoleUseCase,
  RevokeSuperuserUseCase,
} from "./application/manage-roles/manage-roles.use-case.ts";
