import { View } from "react-native";
import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { navigationCopy } from "@/modules/navigation/navigation-copy";
import { theme } from "@/theme/theme";
import { Card, EmptyState, ErrorState, List, ListItem, LoadingState, Screen, Text } from "@/ui";
import { playerSpaceCopy } from "./player-space-copy";
import { isUnauthorized, useGameProfile, usePersonalClub } from "./player-space-data";
import { LoginRedirect, PrerequisiteState } from "./player-space-states";

type Copy = ReturnType<typeof playerSpaceCopy>;

/**
 * Mis estadísticas: the EA performance profile for the personal space's club. These are
 * provider observations; official competition statistics are a separate source.
 */
export function StatisticsScreen() {
  const { language } = useMobileCopy();
  const copy = playerSpaceCopy(language);
  const destinations = navigationCopy(language).destinations;
  const personal = usePersonalClub();
  const profile = useGameProfile(personal.clubId);

  if (isUnauthorized(personal.profile.error) || isUnauthorized(profile.error)) {
    return <LoginRedirect />;
  }

  function body() {
    const failed = personal.profile.isError ? personal.profile : profile.isError ? profile : null;
    if (failed) {
      return (
        <ErrorState
          title={copy.statistics.error}
          description={copy.matches.errorDescription}
          retryLabel={copy.retry}
          retrying={failed.isFetching}
          onRetry={() => void failed.refetch()}
        />
      );
    }
    if (personal.profile.isPending) return <LoadingState label={copy.statistics.loading} />;
    if (personal.clubId === undefined) {
      return (
        <PrerequisiteState
          title={copy.statistics.needsClubTitle}
          description={copy.statistics.needsClubDescription}
          actionLabel={destinations["ea-clubs"][0]}
          href="/player/ea-clubs"
        />
      );
    }
    if (!profile.data) return <LoadingState label={copy.statistics.loading} />;
    if (profile.data.status === "needs_club") {
      return (
        <PrerequisiteState
          title={copy.statistics.needsClubTitle}
          description={copy.statistics.needsClubDescription}
          actionLabel={destinations["ea-clubs"][0]}
          href="/player/ea-clubs"
        />
      );
    }
    if (profile.data.status === "needs_game_account") {
      return (
        <PrerequisiteState
          title={copy.statistics.needsGameAccountTitle}
          description={copy.statistics.needsGameAccountDescription}
          actionLabel={destinations["game-accounts"][0]}
          href="/player/game-accounts"
        />
      );
    }
    const stats = profile.data.profile;
    if (stats.summary.matchesPlayed === 0) {
      return (
        <EmptyState
          title={copy.statistics.emptyTitle}
          description={copy.statistics.emptyDescription}
        />
      );
    }
    return <GameProfile profile={stats} copy={copy} />;
  }

  return (
    <Screen scroll edges={["left", "right"]} centered={false}>
      <View style={{ gap: theme.spacing[5], maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <View style={{ gap: theme.spacing[1] }}>
          <Text role="heading" accessibilityRole="header">
            {copy.statistics.title}
          </Text>
          {personal.club ? (
            <Text color="muted-foreground">
              {copy.statistics.description(personal.club.externalClubName)}
            </Text>
          ) : null}
        </View>
        {body()}
      </View>
    </Screen>
  );
}

function GameProfile({ profile, copy }: { profile: PlayerGameProfileDto; copy: Copy }) {
  const number = new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 2 });
  const { summary } = profile;
  const stats: [string, string][] = [
    [copy.statistics.matches, number.format(summary.matchesPlayed)],
    [copy.statistics.record, `${summary.wins}–${summary.draws}–${summary.losses}`],
    [copy.statistics.goals, number.format(summary.totals.goals)],
    [copy.statistics.assists, number.format(summary.totals.assists)],
    [
      copy.statistics.rating,
      summary.averages.rating === null ? "—" : number.format(summary.averages.rating),
    ],
    [copy.statistics.mvp, number.format(summary.totals.mvpAwards)],
  ];
  return (
    <>
      <View style={{ gap: theme.spacing[1] }}>
        <Text role="title">{profile.identity.displayName}</Text>
        {profile.identity.preferredPosition ? (
          <Text role="caption" color="muted-foreground">
            {profile.identity.preferredPosition}
          </Text>
        ) : null}
      </View>
      <Card title={copy.statistics.summary}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: theme.spacing[4] }}>
          {stats.map(([label, value]) => (
            <View
              key={label}
              accessible
              accessibilityLabel={`${label}: ${value}`}
              style={{ width: "50%", gap: theme.spacing[1] }}
            >
              <Text role="caption" color="muted-foreground">
                {label}
              </Text>
              <Text role="score">{value}</Text>
            </View>
          ))}
        </View>
      </Card>
      {profile.attributes.length > 0 ? (
        <Card title={copy.statistics.attributes} flush>
          <List style={{ borderWidth: 0, borderRadius: 0 }}>
            {profile.attributes.map((attribute) => (
              <ListItem
                key={attribute.category}
                title={copy.statistics.categories[attribute.category]}
                trailing={<Text role="label">{attribute.score}</Text>}
              />
            ))}
          </List>
        </Card>
      ) : null}
    </>
  );
}
