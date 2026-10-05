import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import type {
  AccessibleCompetitionDto,
  NextEncounterDto,
  PlayerExternalClubAssociationDto,
  PlayerGameProfileDto,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import { theme } from "@/theme/theme";
import { Button, EmptyState, Text } from "@/ui";
import { formatEncounterWhen, formatMatchDate, type playerHomeCopy } from "./player-home-copy";
import type { PlayerHomeModel } from "./player-home-model";

type Copy = ReturnType<typeof playerHomeCopy>;

export type SlotProps = {
  copy: Copy;
  language: MobileLanguage;
  retry: () => void;
  refreshing: boolean;
};

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.corner.lg,
        padding: theme.spacing[5],
        gap: theme.spacing[3],
      }}
    >
      {title ? (
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: theme.fontFamily.semibold,
            fontSize: theme.textSizes.lg,
            lineHeight: 24,
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function SectionError({ title, copy, retry, refreshing }: SlotProps & { title: string }) {
  return (
    <Card title={title}>
      <Text color="muted-foreground">{copy.sectionFailed}</Text>
      <Button
        variant="outline"
        label={copy.retry}
        accessibilityLabel={copy.retrySection(title)}
        loading={refreshing}
        onPress={retry}
      />
    </Card>
  );
}

export function ClubChoices({
  clubs,
  copy,
  selected,
  onSelect,
}: {
  clubs: readonly PlayerExternalClubAssociationDto[];
  copy: Copy;
  selected: string | undefined;
  onSelect: (externalClubId: string) => void;
}) {
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <Text role="label" color="muted-foreground">
        {copy.club}
      </Text>
      {clubs.map((club) => {
        const active = club.externalClubId === selected;
        return (
          <Button
            key={`${club.providerKey}:${club.externalClubId}`}
            variant={active ? "secondary" : "outline"}
            label={club.externalClubName}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(club.externalClubId)}
          />
        );
      })}
    </View>
  );
}

export function Hero({
  model,
  clubs,
  onSelect,
  onOpenCompetition,
  ...slot
}: SlotProps & {
  model: PlayerHomeModel;
  clubs: readonly PlayerExternalClubAssociationDto[];
  onSelect: (externalClubId: string) => void;
  onOpenCompetition: (encounter: NextEncounterDto) => void;
}) {
  const { copy, language } = slot;
  const hero = model.hero;
  switch (hero.kind) {
    case "next-encounter": {
      const { encounter } = hero;
      return (
        <Card title={copy.nextTitle}>
          <Text role="caption" color="muted-foreground">
            {encounter.round
              ? copy.round(encounter.competition.name, encounter.round.number)
              : encounter.competition.name}
          </Text>
          <View style={{ gap: theme.spacing[1], alignItems: "center" }}>
            <Text role="body" style={{ fontFamily: theme.fontFamily.semibold }}>
              {encounter.home.name}
            </Text>
            <Text role="label" color="muted-foreground">
              {copy.vs}
            </Text>
            <Text role="body" style={{ fontFamily: theme.fontFamily.semibold }}>
              {encounter.away.name}
            </Text>
          </View>
          <Text style={{ fontFamily: theme.fontFamily.medium, textAlign: "center" }}>
            {formatEncounterWhen(
              encounter.scheduledStartAt,
              encounter.competition.timeZone,
              language,
            )}
          </Text>
          <Text role="caption" color="muted-foreground" style={{ textAlign: "center" }}>
            {copy.pending}
          </Text>
          <Button label={copy.viewCompetition} onPress={() => onOpenCompetition(encounter)} />
        </Card>
      );
    }
    case "no-upcoming":
      return <EmptyState title={copy.noUpcomingTitle} description={copy.noUpcomingDescription} />;
    case "no-competitions":
      return (
        <EmptyState title={copy.noCompetitionsTitle} description={copy.noCompetitionsDescription} />
      );
    case "select-club":
    case "invalid-club":
      return (
        <Card title={hero.kind === "select-club" ? copy.selectClubTitle : copy.invalidClubTitle}>
          <Text color="muted-foreground">
            {hero.kind === "select-club" ? copy.selectClubDescription : copy.invalidClubDescription}
          </Text>
          <ClubChoices clubs={clubs} copy={copy} selected={undefined} onSelect={onSelect} />
        </Card>
      );
    case "onboarding":
      return <EmptyState title={copy.onboardingTitle} description={copy.onboardingDescription} />;
    case "error":
      return <SectionError title={copy.nextTitle} {...slot} />;
  }
}

export function Invitations({
  slot,
  ...props
}: SlotProps & { slot: PlayerHomeModel["invitations"] }) {
  const { copy } = props;
  if (slot.kind === "error") return <SectionError title={copy.invitationsTitle} {...props} />;
  return (
    <Card title={copy.invitationsTitle}>
      <Text>
        {slot.kind === "pending" ? copy.pendingInvitations(slot.count) : copy.noInvitations}
      </Text>
    </Card>
  );
}

export function EaCard({ slot, ...props }: SlotProps & { slot: PlayerHomeModel["eaCard"] }) {
  const { copy } = props;
  if (slot.kind === "error") return <SectionError title={copy.eaTitle} {...props} />;
  return (
    <Card title={copy.eaTitle}>
      {slot.kind === "linked" ? (
        <>
          <Text style={{ fontFamily: theme.fontFamily.semibold }}>{slot.gamertag}</Text>
          <Text role="caption" color="muted-foreground">
            {copy.eaLinked}
          </Text>
        </>
      ) : (
        <Text color="muted-foreground">{copy.eaUnlinked}</Text>
      )}
    </Card>
  );
}

export function Performance({
  slot,
  ...props
}: SlotProps & { slot: PlayerHomeModel["performance"] }) {
  const { copy, language } = props;
  switch (slot.kind) {
    case "error":
      return <SectionError title={copy.performanceTitle} {...props} />;
    case "onboarding":
    case "invalid-club":
      return null;
    case "stats":
      return (
        <Card title={copy.performanceTitle}>
          <StatTiles profile={slot.profile} copy={copy} language={language} />
        </Card>
      );
    case "empty-matches":
      return (
        <Card title={copy.performanceTitle}>
          <Text color="muted-foreground">{copy.statsEmpty}</Text>
        </Card>
      );
    case "locked":
    case "needs-club":
    case "needs-game-account":
      return (
        <Card title={copy.performanceTitle}>
          <Text color="muted-foreground">{copy.statsUnavailable}</Text>
        </Card>
      );
  }
}

function StatTiles({
  profile,
  copy,
  language,
}: {
  profile: PlayerGameProfileDto;
  copy: Copy;
  language: MobileLanguage;
}) {
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const { summary } = profile;
  const rating = summary.averages.rating;
  const stats = [
    [copy.matches, number.format(summary.matchesPlayed)],
    [copy.wins, number.format(summary.wins)],
    [copy.rating, rating === null ? "—" : number.format(rating)],
    [copy.goalsAssists, number.format(summary.totals.goals + summary.totals.assists)],
  ] as const;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing[4] }}>
      {stats.map(([label, value]) => (
        <View
          key={label}
          accessible
          accessibilityLabel={`${label}: ${value}`}
          style={{ minWidth: 120, flexGrow: 1, flexBasis: 0, gap: theme.spacing[1] }}
        >
          <Text role="label" color="muted-foreground">
            {label}
          </Text>
          <Text role="score" style={{ fontVariant: ["tabular-nums"] }}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function LastMatch({ slot, ...props }: SlotProps & { slot: PlayerHomeModel["bottomLeft"] }) {
  const { copy } = props;
  switch (slot.kind) {
    case "error":
      return <SectionError title={copy.lastMatchTitle} {...props} />;
    case "onboarding":
    case "invalid-club":
      return null;
    case "last-match":
      return <LastMatchScore last={slot.last} {...props} />;
    case "empty-matches":
      return (
        <EmptyState title={copy.lastMatchEmptyTitle} description={copy.lastMatchEmptyDescription} />
      );
    case "locked":
    case "needs-club":
    case "needs-game-account":
      return (
        <Card title={copy.lastMatchTitle}>
          <Text color="muted-foreground">{copy.lastMatchLocked}</Text>
        </Card>
      );
  }
}

function LastMatchScore({
  last,
  copy,
  language,
}: SlotProps & { last: PlayerRecentProviderMatchDto }) {
  const { home, away, occurredAt } = last.match;
  const score = `${home.goals} – ${away.goals}`;
  return (
    <Card title={copy.lastMatchTitle}>
      <Text role="caption" color="muted-foreground">
        {copy.finished} · {formatMatchDate(occurredAt, language)}
      </Text>
      <View
        accessible
        accessibilityLabel={`${home.name} ${home.goals}, ${away.name} ${away.goals}`}
        style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing[3] }}
      >
        <Text role="caption" numberOfLines={1} style={{ flex: 1, textAlign: "right" }}>
          {home.name}
        </Text>
        <Text role="score" style={{ fontVariant: ["tabular-nums"] }}>
          {score}
        </Text>
        <Text role="caption" numberOfLines={1} style={{ flex: 1 }}>
          {away.name}
        </Text>
      </View>
      {last.kind === "played" ? null : (
        <Text role="caption" color="muted-foreground">
          {copy.didNotPlay}
        </Text>
      )}
    </Card>
  );
}

export function Competitions({
  slot,
  onOpen,
  ...props
}: SlotProps & {
  slot: PlayerHomeModel["bottomRight"];
  onOpen: (competition: AccessibleCompetitionDto["competition"]) => void;
}) {
  const { copy } = props;
  if (slot.kind === "error") return <SectionError title={copy.competitionsTitle} {...props} />;
  if (slot.kind === "empty") return <EmptyState title={copy.competitionsEmpty} />;
  return (
    <Card title={copy.competitionsTitle}>
      <View style={{ gap: theme.spacing[3] }}>
        {slot.competitions.map(({ competition }) => {
          const detail = `${copy.format[competition.format]} · ${copy.status[competition.status]}`;
          return (
            <Pressable
              key={competition.id}
              accessibilityRole="button"
              accessibilityLabel={`${competition.name}, ${detail}`}
              onPress={() => onOpen(competition)}
              style={{ minHeight: theme.controlHeight, justifyContent: "center", gap: 2 }}
            >
              <Text numberOfLines={1} style={{ fontFamily: theme.fontFamily.semibold }}>
                {competition.name}
              </Text>
              <Text role="caption" color="muted-foreground">
                {detail}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
