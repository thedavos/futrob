import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  activityRow,
  formatActivityTime,
  workspaceContextPath,
  type ActivityDestination,
} from "@futrob/sdk";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { StackFrame } from "@/modules/navigation/stack-frame";
import { theme } from "@/theme/theme";
import { Button, EmptyState, ErrorState, List, ListItem, LoadingState, Text } from "@/ui";
import { teamOrganizationCopy } from "./team-organization-copy";
import { isForbidden, isUnauthorized, useActivityFeed } from "./team-organization-data";
import { LoginRedirect } from "./team-organization-states";

/** Native route a row leads to; `null` when mobile has no screen for it (it stays a fact). */
function destinationHref(destination: ActivityDestination | null): string | null {
  if (!destination) return null;
  switch (destination.kind) {
    case "competition":
    case "team": {
      const competition = workspaceContextPath({
        kind: "competition",
        organizationId: destination.organizationId,
        competitionId: destination.competitionId,
      });
      return destination.kind === "team" ? `${competition}/team` : competition;
    }
    case "roster_invitations":
      // Inicio lists the actor's pending roster invitations with their answers.
      return "/player";
    case "entry_invitation":
      return null;
  }
}

/**
 * Actividad: the organization's feed for its operators, or the actor's own feed (web's
 * `/orgs/:orgId/activity` and `/player/activity`). Newest first, a page at a time.
 */
export function ActivityScreen({ organizationId }: { organizationId?: string }) {
  const router = useRouter();
  const { language } = useMobileCopy();
  const copy = teamOrganizationCopy(language);
  const feed = useActivityFeed({ organizationId });
  const personal = organizationId === undefined;
  const now = new Date();

  if (isUnauthorized(feed.error)) return <LoginRedirect />;

  function body() {
    if (!feed.data) {
      if (isForbidden(feed.error)) {
        return (
          <EmptyState
            title={copy.activity.forbiddenTitle}
            description={copy.activity.forbiddenDescription}
          />
        );
      }
      if (feed.isError) {
        return (
          <ErrorState
            title={copy.activity.error}
            description={copy.errorDescription}
            retryLabel={copy.retry}
            retrying={feed.isFetching}
            onRetry={() => void feed.refetch()}
          />
        );
      }
      return <LoadingState label={copy.activity.loading} rows={6} />;
    }
    const rows = feed.data.pages.flatMap((page) =>
      page.activities.map((entry) => activityRow(entry, now)),
    );
    if (rows.length === 0) {
      return (
        <EmptyState
          title={copy.activity.emptyTitle}
          description={personal ? copy.activity.personalEmpty : copy.activity.organizationEmpty}
        />
      );
    }
    return (
      <>
        <List label={copy.activity.title}>
          {rows.map((row) => {
            const href = destinationHref(row.destination);
            const time = formatActivityTime(row.at, language, now);
            return (
              <ListItem
                key={row.id}
                title={copy.activity.titles[row.title]}
                description={[row.subtitle, time].filter(Boolean).join(" · ")}
                onPress={href ? () => router.push(nativeRoute(href)) : undefined}
              />
            );
          })}
        </List>
        {feed.hasNextPage ? (
          <View style={{ gap: theme.spacing[2], alignItems: "flex-start" }}>
            <Button
              variant="outline"
              label={copy.activity.loadMore}
              loading={feed.isFetchingNextPage}
              onPress={() => void feed.fetchNextPage()}
            />
            {feed.isFetchNextPageError ? (
              <Text role="caption" color="danger" accessibilityRole="alert">
                {copy.activity.loadMoreFailed}
              </Text>
            ) : null}
          </View>
        ) : null}
      </>
    );
  }

  return (
    <StackFrame
      title={copy.activity.title}
      fallbackHref={
        organizationId
          ? `${workspaceContextPath({ kind: "organization", organizationId })}/more`
          : "/player/more"
      }
    >
      <Text color="muted-foreground">
        {personal ? copy.activity.personalDescription : copy.activity.organizationDescription}
      </Text>
      {body()}
    </StackFrame>
  );
}
