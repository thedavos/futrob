import type { ActorId, CompetitionId } from "@futrob/shared-kernel";
import type { OrgMembershipRole } from "../value-objects/organization-membership-role.ts";

export type MemberCompetitionRole = "staff" | "captain" | "vice_captain" | "player";

export interface MemberCompetitionAssignment {
  readonly competitionId: CompetitionId;
  readonly name: string;
  readonly read: "allowed" | "denied";
  readonly role: MemberCompetitionRole | null;
}

export type MemberCompetitionAccess =
  | { readonly kind: "none" }
  | { readonly kind: "inherited" }
  | { readonly kind: "assigned"; readonly competitions: readonly MemberCompetitionAssignment[] }
  | {
      readonly kind: "inherited-with-restriction";
      readonly competitions: readonly MemberCompetitionAssignment[];
    };

export interface OrganizationMemberRecord {
  readonly actorId: ActorId;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly role: OrgMembershipRole;
  readonly joinedAt: Date;
  readonly access: MemberCompetitionAccess;
}
