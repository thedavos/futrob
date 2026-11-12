import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { PlayerTeamMembershipDto } from "@futrob/api-contracts";
import { sortTeamsActiveFirst, workspaceContextPath } from "@futrob/sdk";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { StackFrame } from "@/modules/navigation/stack-frame";
import { theme } from "@/theme/theme";
import { Button, Dialog, EmptyState, ErrorState, List, ListItem, LoadingState, Text } from "@/ui";
import { teamOrganizationCopy } from "./team-organization-copy";
import { isUnauthorized, useMyTeams, useSetActiveTeam } from "./team-organization-data";
import { LoginRedirect } from "./team-organization-states";

/** Path of a Team's roster page, in its competition context. */
export function teamPath(team: PlayerTeamMembershipDto): string {
  const { organizationId, competitionId } = team.membership;
  return `${workspaceContextPath({ kind: "competition", organizationId, competitionId })}/team`;
}

/**
 * Mis equipos: the actor's roster memberships, the active one first. A Team opens its roster or
 * becomes the active Team, the one Futrob uses by default (web's `PUT /players/me/active-team`).
 */
export function MyTeamsScreen() {
  const { language } = useMobileCopy();
  const copy = teamOrganizationCopy(language);
  const teams = useMyTeams();
  const [chosen, setChosen] = useState<PlayerTeamMembershipDto | null>(null);

  if (isUnauthorized(teams.error)) return <LoginRedirect />;

  function body() {
    if (teams.isError) {
      return (
        <ErrorState
          title={copy.myTeams.error}
          description={copy.errorDescription}
          retryLabel={copy.retry}
          retrying={teams.isFetching}
          onRetry={() => void teams.refetch()}
        />
      );
    }
    if (!teams.data) return <LoadingState label={copy.myTeams.loading} />;
    if (teams.data.teams.length === 0) {
      return (
        <EmptyState title={copy.myTeams.emptyTitle} description={copy.myTeams.emptyDescription} />
      );
    }
    return (
      <List label={copy.myTeams.title}>
        {sortTeamsActiveFirst(teams.data.teams).map((item) => (
          <ListItem
            key={item.membership.id}
            title={item.team.name}
            description={
              item.active
                ? `${copy.rosterRoles[item.membership.role]} · ${copy.myTeams.active}`
                : copy.rosterRoles[item.membership.role]
            }
            selected={item.active}
            onPress={() => setChosen(item)}
          />
        ))}
      </List>
    );
  }

  return (
    <StackFrame title={copy.myTeams.title} fallbackHref="/player/more">
      <Text color="muted-foreground">{copy.myTeams.description}</Text>
      {body()}
      {chosen ? <TeamActions team={chosen} onClose={() => setChosen(null)} /> : null}
    </StackFrame>
  );
}

function TeamActions({ team, onClose }: { team: PlayerTeamMembershipDto; onClose: () => void }) {
  const router = useRouter();
  const { language } = useMobileCopy();
  const copy = teamOrganizationCopy(language);
  const makeActive = useSetActiveTeam();
  return (
    <Dialog
      open
      onClose={onClose}
      title={copy.myTeams.actionsTitle(team.team.name)}
      description={copy.rosterRoles[team.membership.role]}
      closeLabel={copy.close}
      actions={
        <View style={{ gap: theme.spacing[3] }}>
          <Button
            label={copy.myTeams.openTeam}
            onPress={() => {
              onClose();
              router.push(nativeRoute(teamPath(team)));
            }}
          />
          {team.active ? null : (
            <Button
              variant="secondary"
              label={copy.myTeams.makeActive}
              loading={makeActive.isPending}
              onPress={() => makeActive.mutate(team.membership.id, { onSuccess: onClose })}
            />
          )}
        </View>
      }
    >
      {makeActive.isError && !isUnauthorized(makeActive.error) ? (
        <Text role="caption" color="danger" accessibilityRole="alert">
          {copy.myTeams.makeActiveFailed}
        </Text>
      ) : null}
    </Dialog>
  );
}
