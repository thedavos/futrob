import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CaretRightIcon, SoccerBallIcon, TrophyIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Caption, Heading, Subtitle, Text, TextLink } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HomeCard } from "./home-card.tsx";
import {
  competitionFormatLabel,
  competitionListBadge,
  competitionListBadgeVariant,
  competitionListStatus,
  competitionMark,
  type CompetitionMark,
} from "./player-home-copy.ts";
import type { PlayerHomeBottomRightSlot } from "./player-home-model.ts";

const ICON_SIZE = 32;

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  row: {
    display: "flex",
    minHeight: "2.75rem",
    alignItems: "center",
    gap: "0.75rem",
    color: colors.foreground,
    textDecorationLine: "none",
  },
  icon: {
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flex: 1,
    flexDirection: "column",
    gap: "0.125rem",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  chevron: {
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  emptyRow: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    columnGap: "0.75rem",
  },
  emptyCopy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.25rem",
  },
  emptyCentered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    gap: "0.75rem",
    textAlign: "center",
  },
  emptyCenteredCopy: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    maxWidth: "24rem",
  },
  emptyTitle: {
    fontWeight: 600,
    fontSize: "var(--text-lg)",
  },
  emptyIcon: {
    alignSelf: "center",
  },
  action: {
    fontWeight: "var(--font-weight-medium)",
  },
  iconCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "start",
    padding: "0.75rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--muted-foreground) 20%, transparent)",
    color: colors.mutedForeground,
  },
  chipIcon: {
    display: "block",
    width: "2rem",
    height: "2rem",
  },
  bodyCopy: {
    color: colors.foreground,
  },
});

export function HomeCompetitionsCard({ slot }: { readonly slot: PlayerHomeBottomRightSlot }) {
  const { t } = useI18n();

  switch (slot.kind) {
    case "list":
      return (
        <HomeCard
          action={{ label: t("player.home.competitions.viewAll"), to: "/player/competitions" }}
          title={t("player.home.competitions.title")}
        >
          <div {...applyStyles(styles.list)}>
            {slot.competitions.map((item) => (
              <Link
                key={item.competition.id}
                to="/player/competitions"
                {...applyStyles(styles.row)}
              >
                <CompetitionMarkIcon mark={competitionMark(item.competition)} />
                <span {...applyStyles(styles.copy)}>
                  <span {...applyStyles(styles.name)}>{item.competition.name}</span>
                  <Caption>
                    {`${competitionFormatLabel(item.competition.format, t)} · ${competitionListStatus(item.competition, t)}`}
                  </Caption>
                </span>
                <Badge variant={competitionListBadgeVariant(item.competition)}>
                  {competitionListBadge(item.competition, t)}
                </Badge>
                <CaretRightIcon aria-hidden size={16} {...applyStyles(styles.chevron)} />
              </Link>
            ))}
          </div>
        </HomeCard>
      );
    case "empty":
      return (
        <HomeCard>
          <div {...applyStyles(styles.emptyCentered)}>
            <span aria-hidden {...applyStyles(styles.iconCell, styles.emptyIcon)}>
              <TrophyIcon aria-hidden size={ICON_SIZE} {...applyStyles(styles.chipIcon)} />
            </span>
            <div {...applyStyles(styles.emptyCenteredCopy)}>
              <Heading className={styles.emptyTitle}>
                {t("player.home.competitions.emptyTitle")}
              </Heading>
              <Subtitle>{t("player.home.competitions.emptySubtitle")}</Subtitle>
            </div>
          </div>
        </HomeCard>
      );
    case "onboarding":
      return (
        <HomeCard title={t("player.home.competitions.onboardingTitle")}>
          <EmptySubtitle
            action={
              <TextLink
                className={styles.action}
                render={<Link to="/player/competitions" />}
                text="caption"
              >
                {t("player.home.cta.exploreCompetitions")}
              </TextLink>
            }
          >
            {t("player.home.competitions.onboardingSubtitle")}
          </EmptySubtitle>
        </HomeCard>
      );
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}

function CompetitionMarkIcon({ mark }: { readonly mark: CompetitionMark }) {
  switch (mark) {
    case "league":
      return <SoccerBallIcon aria-hidden size={20} weight="fill" {...applyStyles(styles.icon)} />;
    case "cup":
      return <TrophyIcon aria-hidden size={20} weight="fill" {...applyStyles(styles.icon)} />;
    default: {
      const _exhaustive: never = mark;
      return _exhaustive;
    }
  }
}

function EmptySubtitle({
  action,
  children,
}: {
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div {...applyStyles(styles.emptyRow)}>
      <span aria-hidden {...applyStyles(styles.iconCell)}>
        <TrophyIcon aria-hidden size={ICON_SIZE} {...applyStyles(styles.chipIcon)} />
      </span>
      <div {...applyStyles(styles.emptyCopy)}>
        <Text className={styles.bodyCopy} look="subtitle" tone="default" weight="medium">
          {children}
        </Text>
        {action}
      </div>
    </div>
  );
}
