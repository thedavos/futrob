import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CircleNotchIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HomeBlockError, homeSlotChrome } from "./home-block-error.tsx";
import { HomeCompetitionsCard } from "./home-competitions-card.tsx";
import { HomeEaCard } from "./home-ea-card.tsx";
import { HomeHero } from "./home-hero.tsx";
import { HomeInvitationsCard } from "./home-invitations-card.tsx";
import { HomeLastMatchCard } from "./home-last-match-card.tsx";
import { HomePerformance } from "./home-performance.tsx";
import {
  HomeCompetitionsSkeleton,
  HomeHeroSkeleton,
  HomeLastMatchSkeleton,
  HomePerformanceSkeleton,
  HomeSideSkeleton,
} from "./home-skeletons.tsx";
import type { PlayerHomeHeaderCta } from "./player-home-model.ts";
import {
  usePlayerHome,
  type PlayerHomeSlotStatus,
  type PlayerHomeView,
} from "./use-player-home.ts";

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  main: {
    width: "100%",
  },
  header: {
    marginBottom: "1rem",
  },
  grid: {
    display: "grid",
    gap: "1rem",
    alignItems: "stretch",
    gridAutoRows: "minmax(min-content, auto)",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 2fr) minmax(0, 1fr)",
    },
  },
  side: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
    minHeight: "min-content",
    alignSelf: {
      default: "auto",
      [media.lg]: "stretch",
    },
  },
  sideSlot: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    minHeight: "min-content",
    flexGrow: {
      default: 0,
      [media.lg]: 1,
    },
    flexShrink: 1,
    flexBasis: {
      default: "auto",
      [media.lg]: 0,
    },
    overflow: "visible",
  },
  stats: {
    gridColumn: {
      default: "auto",
      [media.lg]: "1 / -1",
    },
  },
  bottom: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "1fr 1fr",
    },
    gridColumn: {
      default: "auto",
      [media.lg]: "1 / -1",
    },
  },
  slot: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.5rem",
    minHeight: "min-content",
    alignSelf: "stretch",
    flexGrow: 1,
  },
  spinner: {
    animationName: spin,
    animationDuration: "0.8s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },
});

export function PlayerHomePage({
  externalClubId,
  profileReady,
}: {
  readonly externalClubId?: string;
  readonly profileReady: boolean;
}) {
  const home = usePlayerHome(externalClubId, profileReady);
  return <PlayerHomeViewPage home={home} />;
}

export function PlayerHomeViewPage({ home }: { readonly home: PlayerHomeView }) {
  const { t } = useI18n();
  const clubName =
    home.phase === "ready" && home.facts.club.kind === "selected" ? home.facts.club.name : null;

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader className={styles.header}>
        <PageHeaderTitle>{t("player.home.title")}</PageHeaderTitle>
        <PageHeaderDescription>
          {clubName
            ? t("player.home.subtitle.activity", { club: clubName })
            : t("player.home.subtitle.loading")}
        </PageHeaderDescription>
        <PageHeaderActions>
          <HeaderCta
            cta={home.headerCta}
            matchesRefreshing={home.matchesRefreshing}
            onRefreshMatches={() => {
              void home.refreshMatches();
            }}
          />
        </PageHeaderActions>
      </PageHeader>
      {home.phase === "loading" ? <LoadingGrid /> : <ReadyGrid home={home} />}
    </main>
  );
}

function LoadingGrid() {
  return (
    <HomeGrid
      bottomLeft={<HomeLastMatchSkeleton />}
      bottomRight={<HomeCompetitionsSkeleton />}
      ea={<HomeSideSkeleton />}
      hero={<HomeHeroSkeleton />}
      invitations={<HomeSideSkeleton />}
      performance={<HomePerformanceSkeleton />}
    />
  );
}

function ReadyGrid({ home }: { readonly home: Extract<PlayerHomeView, { phase: "ready" }> }) {
  return (
    <HomeGrid
      bottomLeft={
        <SlotFrame skeleton={<HomeLastMatchSkeleton />} status={home.slots.bottomLeft}>
          <HomeLastMatchCard
            onRefreshMatches={() => {
              void home.refreshMatches();
            }}
            refreshing={home.matchesRefreshing}
            slot={home.layout.bottomLeft}
          />
        </SlotFrame>
      }
      bottomRight={
        <SlotFrame skeleton={<HomeCompetitionsSkeleton />} status={home.slots.bottomRight}>
          <HomeCompetitionsCard slot={home.layout.bottomRight} />
        </SlotFrame>
      }
      ea={
        <SlotFrame skeleton={<HomeSideSkeleton />} status={home.slots.eaCard}>
          <HomeEaCard slot={home.layout.eaCard} />
        </SlotFrame>
      }
      hero={
        <SlotFrame skeleton={<HomeHeroSkeleton />} status={home.slots.hero}>
          <HomeHero slot={home.layout.hero} />
        </SlotFrame>
      }
      invitations={
        <SlotFrame skeleton={<HomeSideSkeleton />} status={home.slots.invitations}>
          <HomeInvitationsCard slot={home.layout.invitations} />
        </SlotFrame>
      }
      performance={
        <SlotFrame skeleton={<HomePerformanceSkeleton />} status={home.slots.performance}>
          <HomePerformance slot={home.layout.performance} />
        </SlotFrame>
      }
    />
  );
}

function HomeGrid({
  bottomLeft,
  bottomRight,
  ea,
  hero,
  invitations,
  performance,
}: {
  readonly bottomLeft: ReactNode;
  readonly bottomRight: ReactNode;
  readonly ea: ReactNode;
  readonly hero: ReactNode;
  readonly invitations: ReactNode;
  readonly performance: ReactNode;
}) {
  return (
    <div {...applyStyles(styles.grid)}>
      {hero}
      <div {...applyStyles(styles.side)}>
        <div {...applyStyles(styles.sideSlot)}>{invitations}</div>
        <div {...applyStyles(styles.sideSlot)}>{ea}</div>
      </div>
      <div {...applyStyles(styles.stats)}>{performance}</div>
      <div {...applyStyles(styles.bottom)}>
        {bottomLeft}
        {bottomRight}
      </div>
    </div>
  );
}

function SlotFrame({
  children,
  skeleton,
  status,
}: {
  readonly children: ReactNode;
  readonly skeleton: ReactNode;
  readonly status: PlayerHomeSlotStatus;
}) {
  if (status.kind === "loading") return skeleton;
  if (status.kind === "error") return <HomeBlockError onRetry={status.retry} />;
  return (
    <div {...applyStyles(styles.slot)}>
      {homeSlotChrome(status)}
      {children}
    </div>
  );
}

function HeaderCta({
  cta,
  matchesRefreshing,
  onRefreshMatches,
}: {
  readonly cta: PlayerHomeHeaderCta;
  readonly matchesRefreshing: boolean;
  readonly onRefreshMatches: () => void;
}) {
  const { t } = useI18n();
  switch (cta) {
    case "matches":
      return <Button render={<Link to="/player/matches" />}>{t("player.home.cta.matches")}</Button>;
    case "refresh-matches":
      return (
        <Button disabled={matchesRefreshing} onClick={onRefreshMatches} type="button">
          {matchesRefreshing ? (
            <CircleNotchIcon aria-hidden {...applyStyles(styles.spinner)} />
          ) : null}
          {matchesRefreshing ? t("player.home.updating") : t("player.home.cta.refreshMatches")}
        </Button>
      );
    case "competitions":
      return (
        <Button render={<Link to="/player/competitions" />}>
          {t("player.home.cta.competitions")}
        </Button>
      );
    case null:
      return null;
    default: {
      const _exhaustive: never = cta;
      return _exhaustive;
    }
  }
}
