import { View } from "react-native";
import { useRouter } from "expo-router";
import { workspaceContextPath } from "@futrob/sdk";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { theme } from "@/theme/theme";
import { Button, EmptyState, ErrorState, List, ListItem, LoadingState, Screen, Text } from "@/ui";
import { playerSpaceCopy } from "./player-space-copy";
import { isUnauthorized, useMyCompetitions } from "./player-space-data";
import { LoginRedirect } from "./player-space-states";

const EXPLORE_HREF = "/player/explore";

/**
 * Mis competiciones: the competitions the player takes part in through a team (captain, vice
 * captain or player). Staff access belongs to the organization's context, not to this list.
 */
export function CompetitionsScreen() {
  const router = useRouter();
  const { language } = useMobileCopy();
  const copy = playerSpaceCopy(language);
  const query = useMyCompetitions();

  if (isUnauthorized(query.error)) return <LoginRedirect />;

  const explore = (
    <Button
      variant="secondary"
      label={copy.competitions.explore}
      onPress={() => router.push(nativeRoute(EXPLORE_HREF))}
    />
  );

  function body() {
    if (query.isError) {
      return (
        <ErrorState
          title={copy.competitions.error}
          description={copy.matches.errorDescription}
          retryLabel={copy.retry}
          retrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      );
    }
    if (!query.data) return <LoadingState label={copy.competitions.loading} />;
    const items = query.data.competitions.filter((item) => item.role !== "staff");
    if (items.length === 0) {
      return (
        <EmptyState
          title={copy.competitions.emptyTitle}
          description={copy.competitions.emptyDescription}
          action={explore}
        />
      );
    }
    return (
      <>
        <List>
          {items.map(({ competition, role }) => (
            <ListItem
              key={competition.id}
              title={competition.name}
              description={`${copy.roles[role]} · ${copy.status[competition.status]}`}
              onPress={() =>
                router.push(
                  nativeRoute(
                    workspaceContextPath({
                      kind: "competition",
                      organizationId: competition.organizationId,
                      competitionId: competition.id,
                    }),
                  ),
                )
              }
            />
          ))}
        </List>
        <View style={{ alignItems: "flex-start" }}>{explore}</View>
      </>
    );
  }

  return (
    <Screen scroll edges={["left", "right"]} centered={false}>
      <View style={{ gap: theme.spacing[5], maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <View style={{ gap: theme.spacing[1] }}>
          <Text role="heading" accessibilityRole="header">
            {copy.competitions.title}
          </Text>
          <Text color="muted-foreground">{copy.competitions.description}</Text>
        </View>
        {body()}
      </View>
    </Screen>
  );
}
