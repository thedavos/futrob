import { useState } from "react";
import {
  orgMembershipRoleSchema,
  type AccessGrantDto,
  type OrgMembershipRoleDto,
} from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Button,
  Caption,
  Field,
  FieldDescription,
  FieldLabel,
  SectionTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { MessageKey, ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { OrganizationsClientError } from "./organizations-browser-client.ts";
import { useChangeMemberRoleMutation, useMemberGrantsQuery } from "./organization-queries.ts";
import { styles as memberStyles } from "./organization-members-sections.styles.ts";

const ROLES = ["organizer", "staff", "member"] as const satisfies readonly OrgMembershipRoleDto[];

const ROLE_HINT = {
  organizer: "organizations.members.organizerHint",
  staff: "organizations.members.staffHint",
  member: "organizations.members.memberHint",
} as const satisfies Record<OrgMembershipRoleDto, MessageKey>;

const styles = stylex.create({
  form: { display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 },
  actions: { display: "flex", justifyContent: "flex-end" },
  grant: { display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 },
  grantHead: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
  permission: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    overflowWrap: "anywhere",
  },
});

export function OrganizationMemberRoleEditor({
  organizationId,
  actorId,
  role,
}: {
  readonly organizationId: string;
  readonly actorId: string;
  readonly role: OrgMembershipRoleDto;
}) {
  const { t } = useI18n();
  // A draft only applies to the role it was picked against, so a confirmed or refreshed role wins.
  const [draft, setDraft] = useState<{
    readonly role: OrgMembershipRoleDto;
    readonly basis: OrgMembershipRoleDto;
  } | null>(null);
  const selected = draft?.basis === role ? draft.role : role;
  const change = useChangeMemberRoleMutation(organizationId, actorId);
  const medium = applyStyles(memberStyles.mediumText);
  const items = ROLES.map((value) => ({ value, label: t(`shell.workspace.role.${value}`) }));
  return (
    <form
      {...applyStyles(styles.form)}
      onSubmit={(event) => {
        event.preventDefault();
        change.mutate({ role: selected });
      }}
    >
      <Field name="organization-member-role">
        <FieldLabel>{t("organizations.members.roleEditor.label")}</FieldLabel>
        <Select
          disabled={change.isPending}
          items={items}
          onValueChange={(value) => {
            const parsed = orgMembershipRoleSchema.safeParse(value);
            if (!parsed.success) return;
            setDraft({ role: parsed.data, basis: role });
            change.reset();
          }}
          value={selected}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={medium.className} style={medium.style}>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>{t(ROLE_HINT[selected])}</FieldDescription>
      </Field>
      {change.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{t(roleChangeFailure(change.error))}</AlertDescription>
        </Alert>
      ) : null}
      {change.isSuccess ? (
        <Alert variant="success">
          <AlertDescription>{t("organizations.members.roleEditor.saved")}</AlertDescription>
        </Alert>
      ) : null}
      <div {...applyStyles(styles.actions)}>
        <Button disabled={change.isPending || change.isSuccess || selected === role} type="submit">
          {t(
            change.isPending
              ? "organizations.members.roleEditor.saving"
              : "organizations.members.roleEditor.save",
          )}
        </Button>
      </div>
    </form>
  );
}

function roleChangeFailure(error: Error): ParameterlessMessageKey {
  if (!(error instanceof OrganizationsClientError))
    return "organizations.members.roleEditor.failed";
  if (error.code === "authorization.last_organizer")
    return "organizations.members.roleEditor.lastOrganizer";
  if (error.status === 403) return "organizations.members.roleEditor.forbidden";
  return "organizations.members.roleEditor.failed";
}

export function OrganizationMemberGrants({
  organizationId,
  actorId,
}: {
  readonly organizationId: string;
  readonly actorId: string;
}) {
  const { t } = useI18n();
  const grants = useMemberGrantsQuery(organizationId, actorId, true);
  return (
    <div {...applyStyles(memberStyles.copy)}>
      <SectionTitle as="h3">{t("organizations.members.grants.title")}</SectionTitle>
      {grants.isPending ? (
        <Caption>{t("organizations.members.grants.loading")}</Caption>
      ) : grants.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{t("organizations.members.grants.failed")}</AlertDescription>
          <Button onClick={() => void grants.refetch()} type="button" variant="outline">
            {t("organizations.members.grants.retry")}
          </Button>
        </Alert>
      ) : grants.data.grants.length === 0 ? (
        <Caption>{t("organizations.members.grants.empty")}</Caption>
      ) : (
        <ul {...applyStyles(memberStyles.accessList)}>
          {grants.data.grants.map((grant) => (
            <MemberGrant grant={grant} key={grant.id} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MemberGrant({ grant }: { readonly grant: AccessGrantDto }) {
  const { t } = useI18n();
  return (
    <li {...applyStyles(styles.grant)}>
      <div {...applyStyles(styles.grantHead)}>
        <span {...applyStyles(styles.permission)}>{grant.permission}</span>
        <Badge variant={grant.effect === "allow" ? "approved" : "destructive"}>
          {t(
            grant.effect === "allow"
              ? "organizations.members.grants.allow"
              : "organizations.members.grants.deny",
          )}
        </Badge>
      </div>
      {grant.reason ? (
        <Caption {...applyStyles(memberStyles.secondary)}>{grant.reason}</Caption>
      ) : null}
    </li>
  );
}
