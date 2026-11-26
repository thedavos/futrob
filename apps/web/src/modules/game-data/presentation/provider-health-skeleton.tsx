import {
  applyStyles,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  SectionTitle,
  Skeleton,
  StatGroup,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./provider-health-page.styles.ts";

const KPI_SKELETONS = [0, 1, 2, 3];
const CALL_ROWS = [0, 1, 2, 3];
const CACHE_ROWS = [0, 1, 2];
const WINDOW_ROWS = [0, 1];

export function ProviderHealthRefreshSkeleton() {
  return <Skeleton aria-hidden="true" {...applyStyles(styles.refreshSkeleton)} />;
}

/**
 * Full-page loading layout for provider health. Mirrors the data-state
 * badges, KPI grid and detail panels so the page does not jump when the
 * first reads resolve.
 */
export function ProviderHealthSkeleton() {
  const { t } = useI18n();
  return (
    <>
      <div aria-hidden="true" {...applyStyles(styles.statusRow)}>
        <Skeleton {...applyStyles(styles.badgeSkeleton)} />
        <Skeleton {...applyStyles(styles.badgeSkeletonWide)} />
      </div>

      <div aria-hidden="true">
        <StatGroup className={styles.kpis}>
          {KPI_SKELETONS.map((index) => (
            <Skeleton key={index} {...applyStyles(styles.kpiSkeleton)} />
          ))}
        </StatGroup>
      </div>

      <div {...applyStyles(styles.sections)}>
        <SkeletonMetaPanel rows={CALL_ROWS} title={t("providerHealth.calls.title")} />
        <SkeletonMetaPanel rows={CACHE_ROWS} title={t("providerHealth.cache.title")} />
        <section {...applyStyles(styles.section)}>
          <SectionTitle>{t("providerHealth.failures.title")}</SectionTitle>
          <Skeleton aria-hidden="true" {...applyStyles(styles.failureSkeleton)} />
        </section>
        <SkeletonMetaPanel rows={WINDOW_ROWS} title={t("providerHealth.window.title")} />
      </div>
    </>
  );
}

function SkeletonMetaPanel({
  rows,
  title,
}: {
  readonly rows: readonly number[];
  readonly title: string;
}) {
  return (
    <section {...applyStyles(styles.section)}>
      <SectionTitle>{title}</SectionTitle>
      <MetaList aria-hidden="true" columns={2}>
        {rows.map((index) => (
          <MetaItem key={index}>
            <MetaTerm>
              <Skeleton {...applyStyles(styles.metaTermSkeleton)} />
            </MetaTerm>
            <MetaValue>
              <Skeleton {...applyStyles(styles.metaValueSkeleton)} />
            </MetaValue>
          </MetaItem>
        ))}
      </MetaList>
    </section>
  );
}
