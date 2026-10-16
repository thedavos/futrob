import type {
  MemberCompetitionAccessDto,
  OrganizationMemberDto,
  OrgMembershipRoleDto,
} from "@futrob/api-contracts";
export type MemberCompetitionAccess = MemberCompetitionAccessDto;

export type OrganizationMemberView = {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly role: OrgMembershipRoleDto;
  readonly joinedAt: string | null;
  readonly access: MemberCompetitionAccess;
};

export type OrganizationMemberChange = {
  readonly id: string;
  readonly description: string;
  readonly performedBy: string;
  readonly occurredAt: string;
};

export type MembersSectionState<T> =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "denied" }
  | { readonly kind: "unavailable" }
  | {
      readonly kind: "data";
      readonly items: readonly T[];
      readonly refresh:
        | { readonly kind: "idle" }
        | { readonly kind: "pending" }
        | { readonly kind: "error"; readonly retry: () => void };
    };

export type MemberRoleFilter = "all" | OrgMembershipRoleDto;

function searchValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function filterOrganizationMembers(
  members: readonly OrganizationMemberView[],
  query: string,
  role: MemberRoleFilter,
): readonly OrganizationMemberView[] {
  const search = searchValue(query.trim());
  return members.filter(
    (member) =>
      (role === "all" || member.role === role) &&
      [member.name, member.email ?? ""].some((value) => searchValue(value).includes(search)),
  );
}

export function formatMemberDate(value: string, locale: string, withTime = false): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: withTime ? "short" : undefined,
    timeZone: "UTC",
  }).format(new Date(value));
}

export function organizationMemberView(
  member: OrganizationMemberDto,
  fallbackName: string,
): OrganizationMemberView {
  return {
    id: member.actorId,
    name: member.displayName?.trim() || fallbackName,
    email: member.email,
    role: member.role,
    joinedAt: member.joinedAt,
    access: member.access,
  };
}
