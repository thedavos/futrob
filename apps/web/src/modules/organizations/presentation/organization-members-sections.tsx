import { useId, useState } from "react";
import { applyStyles } from "@futrob/ui";
import { OrganizationMemberChanges } from "./organization-member-changes.tsx";
import { OrganizationMemberDetail } from "./organization-member-detail.tsx";
import { OrganizationMembersList } from "./organization-members-list.tsx";
import {
  filterOrganizationMembers,
  type MemberRoleFilter,
  type MembersSectionState,
  type OrganizationMemberChange,
  type OrganizationMemberView,
} from "./organization-members-model.ts";
import { styles } from "./organization-members-sections.styles.ts";

export function OrganizationMembersSections({
  members,
  changes,
}: {
  readonly members: MembersSectionState<OrganizationMemberView>;
  readonly changes: MembersSectionState<OrganizationMemberChange>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<MemberRoleFilter>("all");
  const detailId = useId();
  const visible =
    members.kind === "data" ? filterOrganizationMembers(members.items, query, role) : [];
  if (selectedId !== null && !visible.some((member) => member.id === selectedId))
    setSelectedId(null);
  function changeFilters(nextQuery: string, nextRole: MemberRoleFilter) {
    setQuery(nextQuery);
    setRole(nextRole);
    if (
      members.kind !== "data" ||
      !filterOrganizationMembers(members.items, nextQuery, nextRole).some(
        (member) => member.id === selectedId,
      )
    )
      setSelectedId(null);
  }
  const selectedMember =
    members.kind === "data" ? (visible.find((member) => member.id === selectedId) ?? null) : null;
  return (
    <div {...applyStyles(styles.grid)}>
      <OrganizationMembersList
        detailId={detailId}
        onSelect={setSelectedId}
        selectedId={selectedMember?.id ?? null}
        state={members}
        query={query}
        role={role}
        visibleMembers={visible}
        onFiltersChange={changeFilters}
      />
      <OrganizationMemberDetail id={detailId} member={selectedMember} />
      <OrganizationMemberChanges state={changes} />
    </div>
  );
}
