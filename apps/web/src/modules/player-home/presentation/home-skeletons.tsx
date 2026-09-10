import type { ReactNode } from "react";
import { applyStyles, Skeleton } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HomeCard } from "./home-card.tsx";
import { NextEncounterFixture } from "./home-next-encounter-fixture.tsx";
import { nextEncounterFixture } from "./home-next-encounter.styles.ts";
import { styles } from "./home-skeletons.styles.ts";
import type { PlayerHomeLayout } from "./player-home-model.ts";

function SlotCard({
  children,
  flush = false,
  min,
}: {
  readonly children: ReactNode;
  readonly flush?: boolean;
  readonly min: "hero" | "side" | "bottom";
}) {
  const minStyle =
    min === "hero" ? styles.heroSlot : min === "side" ? styles.sideSlot : styles.bottomSlot;
  return (
    <div {...applyStyles(styles.slot, minStyle)}>
      <HomeCard flush={flush}>{children}</HomeCard>
    </div>
  );
}

function EncounterClubSkeleton() {
  return (
    <div {...applyStyles(nextEncounterFixture.club)}>
      <Skeleton {...applyStyles(nextEncounterFixture.crest, styles.fixtureCrest)} />
      <Skeleton {...applyStyles(styles.fixtureName)} />
    </div>
  );
}

export function HomeHeroSkeleton({ kind }: { readonly kind: PlayerHomeLayout["kind"] }) {
  if (kind === "dashboard") {
    return (
      <SlotCard flush min="hero">
        <div {...applyStyles(styles.heroFill)}>
          <div {...applyStyles(styles.heroHeader)}>
            <Skeleton {...applyStyles(styles.heroTitle)} />
            <Skeleton {...applyStyles(styles.roundBadge)} />
          </div>
          <div {...applyStyles(styles.matchup)}>
            <NextEncounterFixture
              away={<EncounterClubSkeleton />}
              home={<EncounterClubSkeleton />}
              meta={
                <>
                  <Skeleton {...applyStyles(styles.when)} />
                  <Skeleton {...applyStyles(styles.pending)} />
                </>
              }
              vs={<Skeleton {...applyStyles(styles.vs)} />}
            />
          </div>
          <Skeleton {...applyStyles(styles.heroCta)} />
        </div>
      </SlotCard>
    );
  }

  return (
    <SlotCard min="hero">
      <div {...applyStyles(styles.artStack)}>
        <div {...applyStyles(styles.heroHeader)}>
          <Skeleton {...applyStyles(styles.heroTitle)} />
          <Skeleton {...applyStyles(styles.subtitle)} />
        </div>
        <div {...applyStyles(styles.artFocus)}>
          <Skeleton {...applyStyles(styles.artWide)} />
          <Skeleton {...applyStyles(styles.artCta)} />
        </div>
      </div>
    </SlotCard>
  );
}

export function HomeSideSkeleton() {
  return (
    <SlotCard min="side">
      <div {...applyStyles(styles.sideBody)}>
        <div {...applyStyles(styles.row)}>
          <Skeleton {...applyStyles(styles.avatar)} />
          <div {...applyStyles(styles.sideCopy)}>
            <Skeleton {...applyStyles(styles.title)} />
            <Skeleton {...applyStyles(styles.subtitle)} />
          </div>
        </div>
      </div>
    </SlotCard>
  );
}

export function HomePerformanceSkeleton({ kind }: { readonly kind: PlayerHomeLayout["kind"] }) {
  const { t } = useI18n();
  if (kind !== "dashboard") {
    return (
      <HomeCard>
        <div {...applyStyles(styles.banner)}>
          <Skeleton {...applyStyles(styles.icon)} />
          <div {...applyStyles(styles.sideCopy)}>
            <Skeleton {...applyStyles(styles.title)} />
            <Skeleton {...applyStyles(styles.subtitle)} />
          </div>
        </div>
      </HomeCard>
    );
  }

  return (
    <section aria-label={t("player.statistics.summary")}>
      <div {...applyStyles(styles.stats)}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} {...applyStyles(styles.stat)}>
            <Skeleton {...applyStyles(styles.icon)} />
            <Skeleton {...applyStyles(styles.grow)} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeLastMatchSkeleton({ kind }: { readonly kind: PlayerHomeLayout["kind"] }) {
  if (kind !== "dashboard") {
    return (
      <SlotCard min="side">
        <div {...applyStyles(styles.emptyCentered)}>
          <Skeleton {...applyStyles(styles.icon)} />
          <div {...applyStyles(styles.emptyCopy)}>
            <Skeleton {...applyStyles(styles.title)} />
            <Skeleton {...applyStyles(styles.subtitle)} />
          </div>
        </div>
      </SlotCard>
    );
  }

  return (
    <SlotCard min="bottom">
      <div {...applyStyles(styles.bottomBody)}>
        <div {...applyStyles(styles.header)}>
          <Skeleton {...applyStyles(styles.title)} />
          <Skeleton {...applyStyles(styles.headerAction)} />
        </div>
        <div {...applyStyles(styles.crests)}>
          <Skeleton {...applyStyles(styles.crest)} />
          <Skeleton {...applyStyles(styles.axis)} />
          <Skeleton {...applyStyles(styles.crest)} />
        </div>
        <Skeleton {...applyStyles(styles.appearance)} />
      </div>
    </SlotCard>
  );
}

export function HomeCompetitionsSkeleton() {
  return (
    <SlotCard min="bottom">
      <div {...applyStyles(styles.list)}>
        <div {...applyStyles(styles.header)}>
          <Skeleton {...applyStyles(styles.title)} />
          <Skeleton {...applyStyles(styles.headerAction)} />
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} {...applyStyles(styles.listRow)}>
            <Skeleton {...applyStyles(styles.avatar)} />
            <Skeleton {...applyStyles(styles.grow)} />
            <Skeleton {...applyStyles(styles.chevron)} />
          </div>
        ))}
      </div>
    </SlotCard>
  );
}

export function homeSlotSkeletons(kind: PlayerHomeLayout["kind"]) {
  return {
    competitions: <HomeCompetitionsSkeleton />,
    ea: <HomeSideSkeleton />,
    hero: <HomeHeroSkeleton kind={kind} />,
    invitations: <HomeSideSkeleton />,
    lastMatch: <HomeLastMatchSkeleton kind={kind} />,
    performance: <HomePerformanceSkeleton kind={kind} />,
  };
}
