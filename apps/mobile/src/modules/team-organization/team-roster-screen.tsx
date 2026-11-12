import { useState } from "react";
import { View } from "react-native";
import type {
  CompetitionTeamManagementDetailResponse,
  CompetitionTeamManagementMemberDto,
  CreateRosterInvitationResponse,
  RosterMembershipRoleDto,
} from "@futrob/api-contracts";
import {
  buildRosterInvitationShareUrl,
  invitableRosterRoles,
  isRosterWritable,
  rosterInvitationBlock,
  rosterRoles,
  teamMembershipForCompetition,
  teamScopeOf,
  workspaceContextPath,
  type TeamScope,
} from "@futrob/sdk";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { StackFrame } from "@/modules/navigation/stack-frame";
import { theme } from "@/theme/theme";
import {
  Button,
  Card,
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
  isUnauthorized,
  useChangeRosterRole,
  useCreateRosterInvitation,
  useMyTeams,
  useSetRosterOpen,
  useTeamAccess,
  useTeamDetail,
} from "./team-organization-data";
import { INVITATION_ORIGIN, LoginRedirect, shareInvitation } from "./team-organization-states";

type Capabilities = {
  readonly manageRoster: boolean;
  readonly manageRoles: boolean;
  readonly manageInvitations: boolean;
};

/**
 * Mi equipo: the actor's Team in a competition — roster, roles and invitations — for its
 * captain and vice captain (web's captain roster and invitations pages). Actions follow
 * `EffectiveAccess` with the Team in scope; the API authorizes every write again.
 */
export function TeamRosterScreen({
  organizationId,
  competitionId,
}: {
  organizationId: string;
  competitionId: string;
}) {
  const { language } = useMobileCopy();
  const copy = teamOrganizationCopy(language);
  const teams = useMyTeams();
  const membership = teams.data
    ? teamMembershipForCompetition(teams.data, competitionId, organizationId)
    : undefined;
  const scope = membership ? teamScopeOf(membership) : undefined;
  const access = useTeamAccess(scope);
  const canRead = access.data?.has(MOBILE_PERMISSION.teamsRosterRead) === true;
  const detail = useTeamDetail(scope, canRead);
  const fallbackHref = `${workspaceContextPath({ kind: "competition", organizationId, competitionId })}/more`;

  if ([teams.error, access.error, detail.error].some(isUnauthorized)) return <LoginRedirect />;

  function body() {
    const failed = teams.isError ? teams : access.isError ? access : detail.isError ? detail : null;
    if (failed) {
      return (
        <ErrorState
          title={copy.team.error}
          description={copy.errorDescription}
          retryLabel={copy.retry}
          retrying={failed.isFetching}
          onRetry={() => void failed.refetch()}
        />
      );
    }
    if (!teams.data) return <LoadingState label={copy.team.loading} />;
    if (!scope) {
      return <EmptyState title={copy.team.noTeamTitle} description={copy.team.noTeamDescription} />;
    }
    if (!access.data) return <LoadingState label={copy.team.loading} />;
    if (!canRead) {
      return (
        <EmptyState title={copy.team.forbiddenTitle} description={copy.team.forbiddenDescription} />
      );
    }
    if (!detail.data) return <LoadingState label={copy.team.loading} />;
    return (
      <TeamRoster
        scope={scope}
        detail={detail.data}
        copy={copy}
        capabilities={{
          manageRoster: access.data.has(MOBILE_PERMISSION.teamsRosterManage),
          manageRoles: access.data.has(MOBILE_PERMISSION.teamsRosterRolesManage),
          manageInvitations: access.data.has(MOBILE_PERMISSION.teamsInvitationsManage),
        }}
      />
    );
  }

  return (
    <StackFrame title={membership?.team.name ?? copy.team.title} fallbackHref={fallbackHref}>
      {body()}
    </StackFrame>
  );
}

function TeamRoster({
  scope,
  detail,
  copy,
  capabilities,
}: {
  scope: TeamScope;
  detail: CompetitionTeamManagementDetailResponse;
  copy: TeamOrganizationCopy;
  capabilities: Capabilities;
}) {
  const [editing, setEditing] = useState<CompetitionTeamManagementMemberDto | null>(null);
  const [inviting, setInviting] = useState(false);
  const setOpen = useSetRosterOpen(scope);
  const writable = isRosterWritable(detail.entry.status);
  const closed = detail.roster.state === "closed";
  const block = rosterInvitationBlock(detail);

  return (
    <>
      <Card>
        <View style={{ gap: theme.spacing[1] }}>
          <Text role="label">{closed ? copy.team.rosterClosed : copy.team.rosterOpen}</Text>
          <Text role="caption" color="muted-foreground">
            {copy.team.entry[detail.entry.status]}
          </Text>
        </View>
      </Card>
      {capabilities.manageInvitations ? (
        <View style={{ gap: theme.spacing[2] }}>
          <Button
            label={copy.team.invite}
            disabled={block !== null}
            onPress={() => setInviting(true)}
          />
          {block ? (
            <Text role="caption" color="muted-foreground">
              {copy.team.blocked[block]}
            </Text>
          ) : null}
        </View>
      ) : null}
      <ListSection title={copy.team.members(detail.roster.memberCount, detail.roster.maxSize)}>
        {detail.members.length === 0 ? (
          <EmptyState title={copy.team.emptyTitle} description={copy.team.emptyDescription} />
        ) : (
          <List label={copy.team.members(detail.roster.memberCount, detail.roster.maxSize)}>
            {detail.members.map((member) => {
              const name = member.presentation.displayName;
              const role = copy.rosterRoles[member.membership.role];
              const account = member.presentation.gameAccount
                ? member.presentation.gameAccount.gameEdition.toUpperCase()
                : copy.team.noGameAccount;
              return (
                <ListItem
                  key={member.membership.id}
                  title={name}
                  description={`${role} · ${account}`}
                  accessibilityHint={
                    capabilities.manageRoles && writable ? copy.team.changeRole(name) : undefined
                  }
                  onPress={
                    capabilities.manageRoles && writable ? () => setEditing(member) : undefined
                  }
                />
              );
            })}
          </List>
        )}
      </ListSection>
      {capabilities.manageRoster && writable ? (
        <View style={{ gap: theme.spacing[2] }}>
          <Button
            variant="outline"
            label={closed ? copy.team.openRoster : copy.team.closeRoster}
            loading={setOpen.isPending}
            onPress={() => setOpen.mutate(closed)}
          />
          {setOpen.isError && !isUnauthorized(setOpen.error) ? (
            <Text role="caption" color="danger" accessibilityRole="alert">
              {copy.team.rosterFailed}
            </Text>
          ) : null}
        </View>
      ) : null}
      {editing ? (
        <RosterRoleDialog
          key={editing.membership.id}
          scope={scope}
          member={editing}
          copy={copy}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {inviting ? (
        <RosterInvitationDialog
          scope={scope}
          teamName={detail.team.name}
          roles={invitableRosterRoles(capabilities.manageRoles)}
          copy={copy}
          onClose={() => setInviting(false)}
        />
      ) : null}
    </>
  );
}

function RosterRoleDialog({
  scope,
  member,
  copy,
  onClose,
}: {
  scope: TeamScope;
  member: CompetitionTeamManagementMemberDto;
  copy: TeamOrganizationCopy;
  onClose: () => void;
}) {
  const change = useChangeRosterRole(scope);
  const name = member.presentation.displayName;
  return (
    <Dialog
      open
      onClose={onClose}
      title={copy.team.roleTitle(name)}
      description={copy.team.roleDescription}
      closeLabel={copy.close}
    >
      <List label={copy.team.roleTitle(name)}>
        {rosterRoles().map((role) => (
          <ListItem
            key={role}
            title={copy.rosterRoles[role]}
            selected={member.membership.role === role}
            disabled={change.isPending}
            onPress={
              member.membership.role === role
                ? undefined
                : () =>
                    change.mutate(
                      { membershipId: member.membership.id, role },
                      { onSuccess: onClose },
                    )
            }
          />
        ))}
      </List>
      {change.isError && !isUnauthorized(change.error) ? (
        <Text role="caption" color="danger" accessibilityRole="alert">
          {copy.team.roleFailed}
        </Text>
      ) : null}
    </Dialog>
  );
}

function RosterInvitationDialog({
  scope,
  teamName,
  roles,
  copy,
  onClose,
}: {
  scope: TeamScope;
  teamName: string;
  roles: readonly RosterMembershipRoleDto[];
  copy: TeamOrganizationCopy;
  onClose: () => void;
}) {
  const { language } = useMobileCopy();
  const create = useCreateRosterInvitation(scope);
  const [role, setRole] = useState<RosterMembershipRoleDto>("player");
  const created: CreateRosterInvitationResponse | undefined = create.data;
  const url = created ? buildRosterInvitationShareUrl(INVITATION_ORIGIN, created.token) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={copy.team.inviteTitle}
      description={copy.team.inviteDescription}
      closeLabel={copy.close}
      actions={
        url ? (
          <Button
            label={copy.team.share}
            onPress={() => shareInvitation(copy.team.shareMessage(teamName, url), url)}
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
      ) : roles.length > 1 ? (
        <ListSection title={copy.team.inviteRole}>
          <List label={copy.team.inviteRole}>
            {roles.map((option) => (
              <ListItem
                key={option}
                title={copy.rosterRoles[option]}
                selected={role === option}
                disabled={create.isPending}
                onPress={() => setRole(option)}
              />
            ))}
          </List>
        </ListSection>
      ) : null}
      {create.isError && !isUnauthorized(create.error) ? (
        <Text role="caption" color="danger" accessibilityRole="alert">
          {copy.team.inviteFailed}
        </Text>
      ) : null}
    </Dialog>
  );
}
