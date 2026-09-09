import * as stylex from "@stylexjs/stylex";
import { applyStyles, Skeleton } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HomeCard } from "./home-card.tsx";

const styles = stylex.create({
  hero: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  crests: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  crest: {
    width: "3.5rem",
    height: "3.5rem",
    borderRadius: "var(--corner-full)",
  },
  axis: {
    width: "2.5rem",
    height: "1rem",
  },
  bar: {
    width: "100%",
    height: "0.75rem",
  },
  trophy: {
    width: "40%",
    height: "0.75rem",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  avatar: {
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "var(--corner-full)",
    flexShrink: 0,
  },
  grow: {
    flex: 1,
    height: "0.75rem",
  },
  chevron: {
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
  },
  stats: {
    display: "grid",
    width: "100%",
    gap: "0.5rem",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
  },
  stat: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    gap: "0.75rem",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    padding: "1rem",
  },
  icon: {
    width: "3rem",
    height: "3rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
});

export function HomeHeroSkeleton() {
  return (
    <HomeCard>
      <div {...applyStyles(styles.hero)}>
        <Skeleton {...applyStyles(styles.bar)} />
        <div {...applyStyles(styles.crests)}>
          <Skeleton {...applyStyles(styles.crest)} />
          <Skeleton {...applyStyles(styles.axis)} />
          <Skeleton {...applyStyles(styles.crest)} />
        </div>
        <Skeleton {...applyStyles(styles.trophy)} />
      </div>
    </HomeCard>
  );
}

export function HomeSideSkeleton() {
  return (
    <HomeCard>
      <div {...applyStyles(styles.row)}>
        <Skeleton {...applyStyles(styles.avatar)} />
        <Skeleton {...applyStyles(styles.grow)} />
        <Skeleton {...applyStyles(styles.chevron)} />
      </div>
    </HomeCard>
  );
}

export function HomePerformanceSkeleton() {
  const { t } = useI18n();
  return (
    <section aria-label={t("player.statistics.summary")}>
      <div {...applyStyles(styles.stats)}>
        <div {...applyStyles(styles.stat)}>
          <Skeleton {...applyStyles(styles.icon)} />
          <Skeleton {...applyStyles(styles.grow)} />
        </div>
        <div {...applyStyles(styles.stat)}>
          <Skeleton {...applyStyles(styles.icon)} />
          <Skeleton {...applyStyles(styles.grow)} />
        </div>
        <div {...applyStyles(styles.stat)}>
          <Skeleton {...applyStyles(styles.icon)} />
          <Skeleton {...applyStyles(styles.grow)} />
        </div>
        <div {...applyStyles(styles.stat)}>
          <Skeleton {...applyStyles(styles.icon)} />
          <Skeleton {...applyStyles(styles.grow)} />
        </div>
      </div>
    </section>
  );
}

export function HomeLastMatchSkeleton() {
  return (
    <HomeCard>
      <div {...applyStyles(styles.hero)}>
        <div {...applyStyles(styles.crests)}>
          <Skeleton {...applyStyles(styles.crest)} />
          <Skeleton {...applyStyles(styles.axis)} />
          <Skeleton {...applyStyles(styles.crest)} />
        </div>
        <Skeleton {...applyStyles(styles.bar)} />
      </div>
    </HomeCard>
  );
}

export function HomeCompetitionsSkeleton() {
  return (
    <HomeCard>
      <div {...applyStyles(styles.list)}>
        <div {...applyStyles(styles.row)}>
          <Skeleton {...applyStyles(styles.avatar)} />
          <Skeleton {...applyStyles(styles.grow)} />
        </div>
        <div {...applyStyles(styles.row)}>
          <Skeleton {...applyStyles(styles.avatar)} />
          <Skeleton {...applyStyles(styles.grow)} />
        </div>
      </div>
    </HomeCard>
  );
}
