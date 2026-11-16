import { useState } from "react";
import { View } from "react-native";
import type {
  CreateInvitationResponse,
  OrganizationMemberDto,
  OrgMembershipRoleDto,
} from "@futrob/api-contracts";
import { buildOrganizationInvitationShareUrl, workspaceContextPath } from "@futrob/sdk";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { StackFrame } from "@/modules/navigation/stack-frame";
import { useContextAccessQuery } from "@/modules/navigation/use-context-access";
import { theme } from "@/theme/theme";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  List,
  ListItem,
  ListSection,
  LoadingState,
  Text,
} from "@/ui";
import { teamOrganizationCopy, type TeamOrganizationCopy } from "./team-organization-copy";
import {
  errorCode,
  errorStatus,
  isUnauthorized,
  useChangeOrganizationRole,
  useCreateOrganizationInvitation,
  useOrganizationMembers,
} from "./team-organization-data";
import { INVITATION_ORIGIN, LoginRedirect, shareInvitation } from "./team-organization-states";

const ORG_ROLES = [
  "organizer",
  "staff",
  "member",
] as const satisfies readonly OrgMembershipRoleDto[];
const INVITE_ROLES = ["member", "staff"] as const;

/**
 * Miembros: who runs the organization (web's settings › members). Inviting and changing roles
 * follow `EffectiveAccess`; the API authorizes both again.
 */
export function OrganizationMembersScreen({ organizationId }: { organizationId: string }) {
  const { language } = useMobileCopy();
  const copy = teamOrganizationCopy(language);
  const access = useContextAccessQuery({ kind: "organization", organizationId });
  const canRead = access.data?.has(MOBILE_PERMISSION.organizationsMembershipsRead) === true;
  const canInvite = access.data?.has(MOBILE_PERMISSION.organizationsInvitationsManage) === true;
  const canManageRoles = access.data?.has(MOBILE_PERMISSION.organizationsRolesManage) === true;
  const members = useOrganizationMembers(organizationId, canRead);
  const [editing, setEditing] = useState<OrganizationMemberDto | null>(null);
  const [inviting, setInviting] = useState(false);
  const dateFormat = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: "UTC" });

  if (isUnauthorized(access.error) || isUnauthorized(members.error)) return <LoginRedirect />;

  function body() {
    const failed = access.isError ? access : members.isError ? members : null;
    if (failed) {
      return (
        <ErrorState
          title={copy.members.error}
          description={copy.errorDescription}
          retryLabel={copy.retry}
          retrying={failed.isFetching}
          onRetry={() => void failed.refetch()}
        />
      );
    }
    if (!access.data) return <LoadingState label={copy.members.loading} />;
    if (!canRead) {
      return (
        <EmptyState
          title={copy.members.forbiddenTitle}
          description={copy.members.forbiddenDescription}
        />
      );
    }
    if (!members.data) return <LoadingState label={copy.members.loading} />;
    if (members.data.members.length === 0) {
      return (
        <EmptyState title={copy.members.emptyTitle} description={copy.members.emptyDescription} />
      );
    }
    return (
      <List label={copy.members.title}>
        {members.data.members.map((member) => {
          const name = member.displayName?.trim() || copy.members.unknownName;
          const joined = copy.members.joined(dateFormat.format(new Date(member.joinedAt)));
          return (
            <ListItem
              key={member.actorId}
              title={name}
              description={[copy.orgRoles[member.role], member.email, joined]
                .filter(Boolean)
                .join(" · ")}
              accessibilityHint={canManageRoles ? copy.members.changeRole(name) : undefined}
              onPress={canManageRoles ? () => setEditing(member) : undefined}
            />
          );
        })}
      </List>
    );
  }

  return (
    <StackFrame
      title={copy.members.title}
      fallbackHref={`${workspaceContextPath({ kind: "organization", organizationId })}/more`}
    >
      <Text color="muted-foreground">{copy.members.description}</Text>
      {canInvite ? (
        <View style={{ alignItems: "flex-start" }}>
          <Button label={copy.members.invite} onPress={() => setInviting(true)} />
        </View>
      ) : null}
      {body()}
      {editing ? (
        <MemberRoleDialog
          key={editing.actorId}
          organizationId={organizationId}
          member={editing}
          copy={copy}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {inviting ? (
        <MemberInvitationDialog
          organizationId={organizationId}
          copy={copy}
          onClose={() => setInviting(false)}
        />
      ) : null}
    </StackFrame>
  );
}

function MemberRoleDialog({
  organizationId,
  member,
  copy,
  onClose,
}: {
  organizationId: string;
  member: OrganizationMemberDto;
  copy: TeamOrganizationCopy;
  onClose: () => void;
}) {
  const change = useChangeOrganizationRole(organizationId);
  const name = member.displayName?.trim() || copy.members.unknownName;
  return (
    <Dialog open onClose={onClose} title={copy.members.roleTitle(name)} closeLabel={copy.close}>
      <List label={copy.members.roleTitle(name)}>
        {ORG_ROLES.map((role) => (
          <ListItem
            key={role}
            title={copy.orgRoles[role]}
            description={copy.members.roleHints[role]}
            selected={member.role === role}
            disabled={change.isPending}
            onPress={
              member.role === role
                ? undefined
                : () => change.mutate({ actorId: member.actorId, role }, { onSuccess: onClose })
            }
          />
        ))}
      </List>
      {change.isError && !isUnauthorized(change.error) ? (
        <Text role="caption" color="danger" accessibilityRole="alert">
          {errorCode(change.error) === "authorization.last_organizer"
            ? copy.members.lastOrganizer
            : copy.members.roleFailed}
        </Text>
      ) : null}
    </Dialog>
  );
}

function MemberInvitationDialog({
  organizationId,
  copy,
  onClose,
}: {
  organizationId: string;
  copy: TeamOrganizationCopy;
  onClose: () => void;
}) {
  const { language } = useMobileCopy();
  const create = useCreateOrganizationInvitation(organizationId);
  const [role, setRole] = useState<(typeof INVITE_ROLES)[number]>("member");
  const created: CreateInvitationResponse | undefined = create.data;
  const url = created
    ? buildOrganizationInvitationShareUrl(INVITATION_ORIGIN, created.token)
    : null;
  // No purchase CTA on mobile (pricing-plans rule 6): the plan is reviewed on the web.
  const planLimited = errorStatus(create.error) === 402;

  return (
    <Dialog
      open
      onClose={onClose}
      title={copy.members.inviteTitle}
      description={copy.members.inviteDescription}
      closeLabel={copy.close}
      actions={
        url ? (
          <Button
            label={copy.team.share}
            onPress={() => shareInvitation(copy.members.shareMessage(url), url)}
          />
        ) : (
          <Button
            label={copy.team.createLink}
            loading={create.isPending}
            onPress={() => create.mutate({ role })}
          />
        )
      }
    >
      {url && created ? (
        <View style={{ gap: theme.spacing[2] }}>
          <Text role="caption" color="muted-foreground">
            {`${copy.team.inviteCreated} ${new Intl.DateTimeFormat(language, {
              dateStyle: "medium",
            }).format(new Date(created.expiresAt))}`}
          </Text>
          <Input label={copy.team.inviteLink} value={url} editable={false} selectTextOnFocus />
        </View>
      ) : (
        <ListSection title={copy.team.inviteRole}>
          <List label={copy.team.inviteRole}>
            {INVITE_ROLES.map((option) => (
              <ListItem
                key={option}
                title={copy.orgRoles[option]}
                description={copy.members.roleHints[option]}
                selected={role === option}
                disabled={create.isPending}
                onPress={() => setRole(option)}
              />
            ))}
          </List>
        </ListSection>
      )}
      {create.isError && !isUnauthorized(create.error) ? (
        <Text role="caption" color="danger" accessibilityRole="alert">
          {planLimited ? copy.members.planLimit : copy.team.inviteFailed}
        </Text>
      ) : null}
    </Dialog>
  );
}
