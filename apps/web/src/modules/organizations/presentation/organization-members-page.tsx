import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@futrob/ui";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import type { CanQuery } from "@/shared/presentation/permissions/use-can.ts";
import { OrganizationMemberInvitationDialog } from "./organization-member-invitation-dialog.tsx";
import type {
  MembersSectionState,
  OrganizationMemberChange,
  OrganizationMemberView,
} from "./organization-members-model.ts";
import { useOrganizationMembersQuery } from "./organization-queries.ts";
import { organizationMemberView } from "./organization-members-model.ts";
import { OrganizationMembersSections } from "./organization-members-sections.tsx";
import { styles as memberStyles } from "./organization-members-sections.styles.ts";

const CAPABILITIES = {
  invite: ORGANIZATION_PERMISSION.invitationsManage,
  members: ORGANIZATION_PERMISSION.membershipsRead,
  changes: ORGANIZATION_PERMISSION.auditRead,
};

const styles = stylex.create({
  main: { width: "100%", minWidth: 0, containerType: "inline-size" },
  header: { marginBottom: "1rem" },
  actions: {
    gridColumnStart: { default: 1, "@container (min-width: 40rem)": 2 },
    gridRowStart: { default: "auto", "@container (min-width: 40rem)": 1 },
    gridRowEnd: { default: "auto", "@container (min-width: 40rem)": "span 3" },
    justifyContent: { default: "flex-start", "@container (min-width: 40rem)": "flex-end" },
  },
});

export function OrganizationMembersPage({ organizationId }: { readonly organizationId: string }) {
  const { t } = useI18n();
  const access = useCapabilities({ organizationId }, CAPABILITIES);
  const query = useOrganizationMembersQuery(
    organizationId,
    !access.loading && !access.unavailable && access.members,
  );
  const retry = () => {
    void query.refetch();
  };
  let members: MembersSectionState<OrganizationMemberView>;
  if (access.loading) members = { kind: "loading" };
  else if (access.unavailable) members = { kind: "unavailable" };
  else if (!access.members || query.data?.kind === "denied") members = { kind: "denied" };
  else if (query.data?.kind === "data")
    members = {
      kind: "data",
      items: query.data.members.map((member) =>
        organizationMemberView(member, t("organizations.members.unknownName")),
      ),
      refresh: query.isError
        ? { kind: "error", retry }
        : query.isFetching
          ? { kind: "pending" }
          : { kind: "idle" },
    };
  else if (query.isError) members = { kind: "error", retry };
  else members = { kind: "loading" };
  return (
    <OrganizationMembersView
      changes={{
        kind: access.loading
          ? "loading"
          : access.unavailable || access.changes
            ? "unavailable"
            : "denied",
      }}
      invite={{
        allowed: !access.unavailable && access.invite,
        loading: access.loading,
        unavailable: access.unavailable,
      }}
      members={members}
      organizationId={organizationId}
    />
  );
}

export function OrganizationMembersView({
  organizationId,
  invite,
  members = { kind: "unavailable" },
  changes = { kind: "unavailable" },
}: {
  readonly organizationId: string;
  readonly invite: CanQuery;
  readonly members?: MembersSectionState<OrganizationMemberView>;
  readonly changes?: MembersSectionState<OrganizationMemberChange>;
}) {
  const { t } = useI18n();
  return (
    <main {...applyStyles(styles.main, memberStyles.mediumText)}>
      <PageHeader className={styles.header}>
        <PageHeaderTitle>{t("pages.organization.members.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("pages.organization.members.subtitle")}</PageHeaderDescription>
        {invite.loading || invite.allowed ? (
          <PageHeaderActions className={styles.actions}>
            <OrganizationMemberInvitationDialog
              disabled={invite.loading}
              organizationId={organizationId}
            />
          </PageHeaderActions>
        ) : null}
      </PageHeader>
      <OrganizationMembersSections key={organizationId} changes={changes} members={members} />
    </main>
  );
}
