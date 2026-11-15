import { useState } from "react";
import { View } from "react-native";
import {
  matchOutcome,
  matchRosters,
  providerMatchMode,
  type ProviderPlayerMatchStatsDto,
} from "@futrob/sdk";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { navigationCopy } from "@/modules/navigation/navigation-copy";
import { StackFrame } from "@/modules/navigation/stack-frame";
import { theme } from "@/theme/theme";
import {
  Card,
  EmptyState,
  ErrorState,
  List,
  ListItem,
  ListSection,
  LoadingState,
  Tabs,
  Text,
} from "@/ui";
import { playerSpaceCopy } from "./player-space-copy";
import { isUnauthorized, usePersonalClub, useRecentMatch } from "./player-space-data";
import { LoginRedirect, PrerequisiteState } from "./player-space-states";

type Copy = ReturnType<typeof playerSpaceCopy>;
type Section = "summary" | "players";

/**
 * Detail of one provider match from Mis partidos. It reads its own resource for the full
 * line-ups; a match outside EA's recent window is `not_found`, never an empty match.
 */
export function MatchDetailScreen({
  providerKey,
  externalMatchId,
}: {
  providerKey: "ea-clubs" | "manual" | "screenshot-ocr";
  externalMatchId: string;
}) {
  const { language } = useMobileCopy();
  const copy = playerSpaceCopy(language);
  const destinations = navigationCopy(language).destinations;
  const personal = usePersonalClub();
  // Wait for the profile so the detail is read once, for the personal space's club.
  const query = useRecentMatch(
    { providerKey, externalMatchId, externalClubId: personal.clubId },
    !personal.profile.isPending,
  );
  const [section, setSection] = useState<Section>("summary");

  if (isUnauthorized(query.error) || isUnauthorized(personal.profile.error)) {
    return <LoginRedirect />;
  }

  function body() {
    if (query.isError) {
      return (
        <ErrorState
          title={copy.match.error}
          description={copy.matches.errorDescription}
          retryLabel={copy.retry}
          retrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      );
    }
    if (!query.data) return <LoadingState label={copy.match.loading} />;
    const result = query.data;
    if (result.status === "not_found") {
      return (
        <EmptyState title={copy.match.notFoundTitle} description={copy.match.notFoundDescription} />
      );
    }
    if (result.status === "needs_club") {
      return (
        <PrerequisiteState
          title={copy.matches.needsClubTitle}
          description={copy.matches.needsClubDescription}
          actionLabel={destinations["ea-clubs"][0]}
          href="/player/ea-clubs"
        />
      );
    }
    if (result.status === "needs_game_account") {
      return (
        <PrerequisiteState
          title={copy.matches.needsGameAccountTitle}
          description={copy.matches.needsGameAccountDescription}
          actionLabel={destinations["game-accounts"][0]}
          href="/player/game-accounts"
        />
      );
    }

    const detail = result.match;
    const mode = providerMatchMode(detail);
    const rosters = matchRosters(detail);
    const when = new Intl.DateTimeFormat(copy.locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(detail.match.occurredAt));

    return (
      <>
        <Card>
          <Text
            role="score"
            accessibilityLabel={`${detail.match.home.name} ${detail.match.home.goals}, ${detail.match.away.name} ${detail.match.away.goals}`}
          >
            {detail.match.home.goals} – {detail.match.away.goals}
          </Text>
          <Text role="label">
            {detail.match.home.name} · {detail.match.away.name}
          </Text>
          <Text role="caption" color="muted-foreground">
            {[
              copy.matches.outcomes[matchOutcome(detail)],
              mode ? copy.matches.types[mode] : null,
              when,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Card>
        <Tabs
          variant="pills"
          label={copy.match.tabsLabel}
          value={section}
          onChange={setSection}
          items={[
            { id: "summary", label: copy.match.summary },
            { id: "players", label: copy.match.players },
          ]}
        />
        {section === "summary" ? (
          detail.kind === "played" ? (
            <AppearanceCard appearance={detail.appearance} copy={copy} />
          ) : (
            <EmptyState title={copy.matches.notPlayed} />
          )
        ) : (
          rosters.map((roster) => (
            <ListSection key={roster.side} title={`${roster.name} · ${roster.goals}`}>
              <List>
                {roster.players.map((player) => (
                  <ListItem
                    key={player.externalPlayerId}
                    title={
                      player.isMvp
                        ? `${player.displayName} · ${copy.match.mvp}`
                        : player.displayName
                    }
                    description={copy.match.playerLine(
                      player.position,
                      formatRating(player.rating, copy),
                    )}
                  />
                ))}
              </List>
            </ListSection>
          ))
        )}
      </>
    );
  }

  return (
    <StackFrame title={copy.match.title} fallbackHref="/player/matches">
      {body()}
    </StackFrame>
  );
}

function formatRating(rating: number | null, copy: Copy): string | null {
  return rating === null
    ? null
    : new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 1 }).format(rating);
}

/** The player's own line. Unknown values stay «—»; they are never shown as zero. */
function AppearanceCard({
  appearance,
  copy,
}: {
  appearance: ProviderPlayerMatchStatsDto;
  copy: Copy;
}) {
  const value = (number: number | null) =>
    number === null ? copy.match.unknown : new Intl.NumberFormat(copy.locale).format(number);
  const rows: [string, string][] = [
    [copy.match.stats.minutes, value(appearance.minutesPlayed)],
    [copy.match.stats.goals, value(appearance.goals)],
    [copy.match.stats.assists, value(appearance.assists)],
    [copy.match.stats.shots, value(appearance.shots)],
    [
      copy.match.stats.passes,
      appearance.passesMade === null || appearance.passAttempts === null
        ? copy.match.unknown
        : `${appearance.passesMade}/${appearance.passAttempts}`,
    ],
    [
      copy.match.stats.tackles,
      appearance.tacklesMade === null || appearance.tackleAttempts === null
        ? copy.match.unknown
        : `${appearance.tacklesMade}/${appearance.tackleAttempts}`,
    ],
    [copy.match.stats.saves, value(appearance.saves)],
    [copy.match.stats.rating, formatRating(appearance.rating, copy) ?? copy.match.unknown],
  ];
  return (
    <Card
      title={
        appearance.isMvp ? `${copy.match.yourMatch} · ${copy.match.mvp}` : copy.match.yourMatch
      }
    >
      {rows.map(([label, display]) => (
        <View
          key={label}
          accessible
          accessibilityLabel={`${label}: ${display}`}
          style={{ flexDirection: "row", justifyContent: "space-between", gap: theme.spacing[3] }}
        >
          <Text color="muted-foreground">{label}</Text>
          <Text role="label" style={{ fontVariant: ["tabular-nums"] }}>
            {display}
          </Text>
        </View>
      ))}
    </Card>
  );
}
