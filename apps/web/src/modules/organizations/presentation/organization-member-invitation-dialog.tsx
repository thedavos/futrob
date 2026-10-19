import { useState } from "react";
import type { CreateOrganizationInvitationRequest } from "@futrob/api-contracts";
import { organizationInviteRoleSchema } from "@futrob/api-contracts";
import { CheckIcon, CopyIcon, UserPlusIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useCopyToClipboard,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { buildInvitationShareUrl } from "./invitation-share-url.ts";
import { useCreateOrganizationInvitationMutation } from "./organization-queries.ts";
import { styles as memberStyles } from "./organization-members-sections.styles.ts";

const styles = stylex.create({
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
    marginTop: "1rem",
  },
});

export function OrganizationMemberInvitationDialog({
  organizationId,
  disabled,
}: {
  readonly organizationId: string;
  readonly disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Dialog>
      <DialogTrigger disabled={disabled} render={<Button />}>
        <UserPlusIcon aria-hidden="true" />
        {t("organizations.members.invite")}
      </DialogTrigger>
      <DialogContent className={memberStyles.mediumText}>
        <OrganizationMemberInvitationForm organizationId={organizationId} />
      </DialogContent>
    </Dialog>
  );
}

function OrganizationMemberInvitationForm({ organizationId }: { readonly organizationId: string }) {
  const { t } = useI18n();
  const [role, setRole] = useState<CreateOrganizationInvitationRequest["role"]>("member");
  const invitation = useCreateOrganizationInvitationMutation(organizationId);
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const [copyFailed, setCopyFailed] = useState(false);
  const roleItems = [
    { value: "member", label: t("shell.workspace.role.member") },
    { value: "staff", label: t("shell.workspace.role.staff") },
  ];
  const url = invitation.data ? buildInvitationShareUrl(invitation.data.token) : null;
  const medium = applyStyles(memberStyles.mediumText);

  async function copyInvitation() {
    if (url) setCopyFailed(!(await copyToClipboard(url)));
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("organizations.members.invite")}</DialogTitle>
        <DialogDescription>{t("organizations.members.inviteDescription")}</DialogDescription>
      </DialogHeader>
      <div {...applyStyles(styles.fields)}>
        {invitation.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{t("organizations.members.inviteFailed")}</AlertDescription>
          </Alert>
        ) : null}
        {url ? (
          <>
            <Alert variant="success">
              <AlertDescription>{t("organizations.members.inviteCreated")}</AlertDescription>
            </Alert>
            <Field name="organization-invitation-link">
              <FieldLabel>{t("organizations.members.inviteLink")}</FieldLabel>
              <Input readOnly value={url} />
              <FieldDescription>{t("organizations.members.inviteLinkHint")}</FieldDescription>
            </Field>
            {copyFailed ? (
              <Alert variant="destructive">
                <AlertDescription>{t("organizations.members.copyFailed")}</AlertDescription>
              </Alert>
            ) : null}
          </>
        ) : (
          <Field name="organization-invitation-role">
            <FieldLabel>{t("organizations.members.role")}</FieldLabel>
            <Select
              disabled={invitation.isPending}
              items={roleItems}
              onValueChange={(value) => {
                const parsed = organizationInviteRoleSchema.safeParse(value);
                if (parsed.success) setRole(parsed.data);
              }}
              value={role}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={medium.className} style={medium.style}>
                {roleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {t(
                role === "member"
                  ? "organizations.members.memberHint"
                  : "organizations.members.staffHint",
              )}
            </FieldDescription>
          </Field>
        )}
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>
          {url ? t("organizations.members.done") : t("common.cancel")}
        </DialogClose>
        {url ? (
          <Button onClick={() => void copyInvitation()} type="button">
            {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
            {isCopied ? t("organizations.members.copied") : t("organizations.members.copy")}
          </Button>
        ) : (
          <Button
            disabled={invitation.isPending}
            onClick={() => invitation.mutate({ role, redeemPolicy: "single" })}
            type="button"
          >
            {t(
              invitation.isPending
                ? "organizations.members.creating"
                : "organizations.members.createLink",
            )}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
