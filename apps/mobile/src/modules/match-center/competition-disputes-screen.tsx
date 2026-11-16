import { View } from "react-native";
import { useRouter } from "expo-router";
import { isSelectionRefusal } from "@futrob/sdk";
import { GateBoundary } from "@/modules/identity/gate-boundary";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { theme } from "@/theme/theme";
import { Button, EmptyState, ErrorState, List, ListItem, LoadingState, Screen, Text } from "@/ui";
import { formatInCompetitionZone, matchCenterCopy } from "./match-center-copy";
import { useCompetitionDisputes } from "./use-match-center";

type Params = { readonly organizationId: string; readonly competitionId: string };

/**
 * `/orgs/:orgId/competitions/:competitionId/disputes`: the Encounters whose selection waits on
 * an organization decision. Listed in «Más» only for actors who approve results; the API
 * refuses everyone else, shown as unavailable rather than as an empty list.
 */
export function CompetitionDisputesScreen(params: Params) {
  return (
    <GateBoundary mode="ready">
      <DisputesContent {...params} />
    </GateBoundary>
  );
}

function DisputesContent({ organizationId, competitionId }: Params) {
  const router = useRouter();
  const { language } = useMobileCopy();
  const copy = matchCenterCopy(language);
  const query = useCompetitionDisputes(organizationId, competitionId);
  const competitionRoute = `/orgs/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`;
  const data = query.data;

  return (
    <Screen scroll centered={false}>
      <View style={{ gap: theme.spacing[5], maxWidth: 560, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "flex-start" }}>
          <Button
            variant="ghost"
            label={copy.back}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace(nativeRoute(competitionRoute))
            }
          />
        </View>
        <View style={{ gap: theme.spacing[1] }}>
          {data ? (
            <Text role="caption" color="muted-foreground">
              {data.competition.name}
            </Text>
          ) : null}
          <Text role="heading" accessibilityRole="header">
            {copy.disputesTitle}
          </Text>
          {data ? (
            <Text role="caption" color="muted-foreground">
              {copy.timeZone(data.competition.timeZone)}
            </Text>
          ) : null}
        </View>
        {!data && query.isPending ? <LoadingState label={copy.disputesLoading} /> : null}
        {!data && query.isError && isSelectionRefusal(query.error) ? (
          <EmptyState
            title={copy.disputesNotFoundTitle}
            description={copy.disputesNotFoundDescription}
          />
        ) : null}
        {!data && query.isError && !isSelectionRefusal(query.error) ? (
          <ErrorState
            title={copy.disputesError}
            retryLabel={copy.retry}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : null}
        {data && data.disputes.length === 0 ? (
          <EmptyState title={copy.disputesEmptyTitle} description={copy.disputesEmptyDescription} />
        ) : null}
        {data && data.disputes.length > 0 ? (
          <List label={copy.disputesTitle}>
            {data.disputes.map((dispute) => {
              const home = dispute.home.name ?? copy.disputesTeamUnnamed;
              const away = dispute.away.name ?? copy.disputesTeamUnnamed;
              const when = formatInCompetitionZone(
                dispute.scheduledStartAt,
                data.competition.timeZone,
                language,
              );
              return (
                <ListItem
                  key={dispute.encounterId}
                  title={`${home} ${copy.vs} ${away}`}
                  description={`${copy.disputesStatus[dispute.status]} · ${copy.disputesKickoff(when)}`}
                  accessibilityLabel={copy.disputesOpen(home, away)}
                  onPress={() =>
                    router.push(
                      nativeRoute(
                        `${competitionRoute}/encounters/${encodeURIComponent(dispute.encounterId)}`,
                      ),
                    )
                  }
                />
              );
            })}
          </List>
        ) : null}
      </View>
    </Screen>
  );
}
