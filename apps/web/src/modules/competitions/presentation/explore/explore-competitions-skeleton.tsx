import { applyStyles, Card, Skeleton } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./explore-competitions-page.styles.ts";

export function ExploreCompetitionsSkeleton() {
  const { t } = useI18n();
  return (
    <div
      aria-busy="true"
      aria-label={t("player.competitions.explore.loading")}
      role="status"
      {...applyStyles(styles.body)}
    >
      <div {...applyStyles(styles.toolbarRow)}>
        <Skeleton {...applyStyles(styles.skeletonCount)} />
      </div>
      <div {...applyStyles(styles.grid)}>
        {Array.from({ length: 6 }, (_, index) => (
          <Card className={styles.skeletonCard} key={index}>
            <Skeleton {...applyStyles(styles.skeletonTitle)} />
            <Skeleton {...applyStyles(styles.skeletonLine)} />
            <Skeleton {...applyStyles(styles.skeletonMeta)} />
            <Skeleton {...applyStyles(styles.skeletonAction)} />
          </Card>
        ))}
      </div>
    </div>
  );
}
