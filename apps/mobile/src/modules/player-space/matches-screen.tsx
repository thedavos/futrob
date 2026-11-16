import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import {
  appearanceScoringFeat,
  isDnfMatch,
  matchOutcome,
  opponentClubName,
  PLAYER_MATCHES_VIEWS,
  MATCH_SORT_ORDERS,
  playerMatchSide,
  presentPlayerMatches,
  providerMatchMode,
  type MatchDayGroup,
  type MatchSortOrder,
  type PlayerMatchesView,
} from "@futrob/sdk";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { navigationCopy } from "@/modules/navigation/navigation-copy";
import { theme } from "@/theme/theme";
import {
  Button,
  EmptyState,
  ErrorState,
  List,
  ListItem,
  ListSection,
  LoadingState,
  Screen,
  Tabs,
  Text,
} from "@/ui";
import { playerSpaceCopy } from "./player-space-copy";
import { isUnauthorized, usePersonalClub, useRecentMatches } from "./player-space-data";
import { LoginRedirect, PrerequisiteState } from "./player-space-states";

type Copy = ReturnType<typeof playerSpaceCopy>;

/** Mis partidos: provider matches of the personal space's club, by type, order and day. */
export function MatchesScreen({ now = new Date() }: { now?: Date }) {
  const router = useRouter();
  const { language } = useMobileCopy();
  const copy = playerSpaceCopy(language);
  const destinations = navigationCopy(language).destinations;
  const personal = usePersonalClub();
  const matches = useRecentMatches(personal.clubId);
  const [view, setView] = useState<PlayerMatchesView>("all");
  const [order, setOrder] = useState<MatchSortOrder>("newest");

  if (isUnauthorized(personal.profile.error) || isUnauthorized(matches.error)) {
    return <LoginRedirect />;
  }

  function body() {
    if (personal.profile.isError) {
      return (
        <ErrorState
          title={copy.matches.error}
          description={copy.matches.errorDescription}
          retryLabel={copy.retry}
          retrying={personal.profile.isFetching}
          onRetry={() => void personal.profile.refetch()}
        />
      );
    }
    if (personal.profile.isPending) return <LoadingState label={copy.matches.loading} />;
    if (personal.clubId === undefined) {
      return (
        <PrerequisiteState
          title={copy.matches.needsClubTitle}
          description={copy.matches.needsClubDescription}
          actionLabel={destinations["ea-clubs"][0]}
          href="/player/ea-clubs"
        />
      );
    }
    if (matches.isError) {
      return (
        <ErrorState
          title={copy.matches.error}
          description={copy.matches.errorDescription}
          retryLabel={copy.retry}
          retrying={matches.isFetching}
          onRetry={() => void matches.refetch()}
        />
      );
    }
    if (!matches.data) return <LoadingState label={copy.matches.loading} />;

    const state = presentPlayerMatches(matches.data, { view, order, now });
    switch (state.kind) {
      case "needs-club":
        return (
          <PrerequisiteState
            title={copy.matches.needsClubTitle}
            description={copy.matches.needsClubDescription}
            actionLabel={destinations["ea-clubs"][0]}
            href="/player/ea-clubs"
          />
        );
      case "needs-game-account":
        return (
          <PrerequisiteState
            title={copy.matches.needsGameAccountTitle}
            description={copy.matches.needsGameAccountDescription}
            actionLabel={destinations["game-accounts"][0]}
            href="/player/game-accounts"
          />
        );
      case "empty":
        return (
          <EmptyState title={copy.matches.emptyTitle} description={copy.matches.emptyDescription} />
        );
      case "filtered-empty":
        return (
          <EmptyState
            title={copy.matches.filteredEmpty[state.view]}
            description={copy.matches.filteredEmptyDescription}
            action={
              <Button
                variant="secondary"
                label={copy.matches.showAll}
                onPress={() => setView("all")}
              />
            }
          />
        );
      case "ready":
        return state.days.map((day) => (
          <MatchDay
            key={day.dayKey}
            day={day}
            copy={copy}
            showType={view === "all"}
            onOpen={(item) =>
              router.push(
                nativeRoute(
                  `/player/matches/${encodeURIComponent(item.match.provider.key)}/${encodeURIComponent(item.match.provider.externalMatchId)}`,
                ),
              )
            }
          />
        ));
    }
  }

  const showFilters = personal.clubId !== undefined && matches.data?.status === "ready";

  return (
    <Screen scroll edges={["left", "right"]} centered={false}>
      <View style={{ gap: theme.spacing[5], maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <View style={{ gap: theme.spacing[1] }}>
          <Text role="heading" accessibilityRole="header">
            {copy.matches.title}
          </Text>
          {personal.club ? (
            <Text color="muted-foreground">
              {copy.matches.description(personal.club.externalClubName)}
            </Text>
          ) : null}
        </View>
        {showFilters ? (
          <View style={{ gap: theme.spacing[3] }}>
            <Tabs
              variant="pills"
              label={copy.matches.viewLabel}
              value={view}
              onChange={setView}
              items={PLAYER_MATCHES_VIEWS.map((id) => ({ id, label: copy.matches.views[id] }))}
            />
            <Tabs
              label={copy.matches.sortLabel}
              value={order}
              onChange={setOrder}
              items={MATCH_SORT_ORDERS.map((id) => ({ id, label: copy.matches.sorts[id] }))}
            />
          </View>
        ) : null}
        {body()}
      </View>
    </Screen>
  );
}

function MatchDay({
  day,
  copy,
  showType,
  onOpen,
}: {
  day: MatchDayGroup;
  copy: Copy;
  showType: boolean;
  onOpen: (item: PlayerRecentProviderMatchDto) => void;
}) {
  const title =
    day.kind === "other"
      ? new Intl.DateTimeFormat(copy.locale, { day: "numeric", month: "long" }).format(
          day.occurredAt,
        )
      : copy.matches.days[day.kind];
  return (
    <ListSection title={title}>
      <List>
        {day.matches.map((item) => (
          <MatchRow
            key={item.match.id}
            item={item}
            copy={copy}
            showType={showType}
            onOpen={() => onOpen(item)}
          />
        ))}
      </List>
    </ListSection>
  );
}

/** One match from the selected club's side: score first for that club, then the rival. */
function MatchRow({
  item,
  copy,
  showType,
  onOpen,
}: {
  item: PlayerRecentProviderMatchDto;
  copy: Copy;
  showType: boolean;
  onOpen: () => void;
}) {
  const side = playerMatchSide(item);
  const ours = side === "away" ? item.match.away.goals : item.match.home.goals;
  const theirs = side === "away" ? item.match.home.goals : item.match.away.goals;
  const opponent = opponentClubName(item) ?? item.match.away.name;
  const mode = providerMatchMode(item);
  const feat = appearanceScoringFeat(item);
  const time = new Intl.DateTimeFormat(copy.locale, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(item.match.occurredAt),
  );
  const details = [
    `${copy.matches.outcomes[matchOutcome(item)]} ${ours}–${theirs}`,
    showType && mode ? copy.matches.types[mode] : null,
    time,
    isDnfMatch(item) ? copy.matches.dnf : null,
    item.kind === "not_played"
      ? copy.matches.notPlayed
      : feat
        ? copy.matches.feats[feat]
        : item.appearance.goals
          ? copy.matches.goals(item.appearance.goals)
          : null,
  ].filter((part): part is string => part !== null);

  return (
    <ListItem
      title={copy.matches.vs(opponent)}
      description={details.join(" · ")}
      onPress={onOpen}
    />
  );
}
