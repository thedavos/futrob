import type { ReactNode } from "react";
import {
  ArrowsClockwiseIcon,
  GaugeIcon,
  HardDrivesIcon,
  ListNumbersIcon,
  PulseIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Button,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateTitle,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  SectionTitle,
  Skeleton,
  Stat,
  StatGroup,
  StatLabel,
  type Icon,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { GameDataProviderKeyQuery } from "@futrob/api-contracts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useIsSuperuser } from "@/shared/presentation/permissions/index.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";
import {
  circuitStateBadgeVariant,
  providerHealthView,
  providerStatusBadgeVariant,
  type ProviderHealthView,
} from "./provider-health-model.ts";
import { useProviderHealthQuery } from "./provider-health-queries.ts";

const PROVIDER_KEY: GameDataProviderKeyQuery = "ea-clubs";
const KPI_ICON_SIZE = 32;

const styles = stylex.create({
  main: { width: "100%", minWidth: 0 },
  body: { display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" },
  statusRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" },
  kpis: {
    display: "grid",
    width: "100%",
    gap: "1rem",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
  },
  kpiSkeleton: { height: "5.625rem", width: "100%", borderRadius: "var(--corner-lg)" },
  panel: {
    height: "100%",
    minWidth: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    padding: "1rem",
    gap: "0.5rem",
  },
  stack: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    minWidth: 0,
    columnGap: "0.75rem",
  },
  iconCell: {
    gridColumn: "1",
    gridRow: "1 / -1",
    alignSelf: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "0.75rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
    color: colors.primary,
  },
  icon: { display: "block", width: "2rem", height: "2rem" },
  textCol: {
    gridColumn: "2",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "0.25rem",
  },
  pending: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  sections: {
    display: "grid",
    gap: "1.5rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "repeat(2, minmax(0, 1fr))",
    },
  },
  section: { display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 },
  muted: { color: colors.mutedForeground, fontSize: "0.875rem", lineHeight: "1.25rem" },
});

export function ProviderHealthPage() {
  const { t } = useI18n();
  const access = useIsSuperuser();
  const query = useProviderHealthQuery(PROVIDER_KEY, { enabled: access.allowed });
  const retry = () => {
    void query.refetch();
  };
  const denied = query.data === null;

  let body: ReactNode;
  if (access.loading) {
    body = (
      <p role="status" {...applyStyles(styles.pending)}>
        {t("providerHealth.checkingAccess")}
      </p>
    );
  } else if (access.unavailable) {
    body = (
      <Alert variant="destructive">
        <AlertDescription>{t("providerHealth.accessUnavailable")}</AlertDescription>
      </Alert>
    );
  } else if (!access.allowed || denied) {
    body = <DeniedState />;
  } else if (query.data) {
    body = (
      <>
        {query.isError ? (
          <RetryAlert
            message={t("providerHealth.refreshError")}
            retry={retry}
            t={t}
            variant="warning"
          />
        ) : null}
        <ProviderHealthContent view={providerHealthView(query.data)} />
      </>
    );
  } else if (query.isError) {
    body = <RetryAlert message={t("providerHealth.error")} retry={retry} t={t} />;
  } else {
    body = <ProviderHealthSkeleton label={t("providerHealth.loading")} />;
  }

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("providerHealth.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("providerHealth.subtitle")}</PageHeaderDescription>
        {access.allowed ? (
          <PageHeaderActions>
            <Button disabled={query.isFetching} onClick={retry} type="button" variant="outline">
              <ArrowsClockwiseIcon aria-hidden />
              {t("providerHealth.refresh")}
            </Button>
          </PageHeaderActions>
        ) : null}
      </PageHeader>
      <div {...applyStyles(styles.body)}>{body}</div>
    </main>
  );
}

function DeniedState() {
  const { t } = useI18n();
  return (
    <EmptyState>
      <EmptyStateCopy>
        <EmptyStateTitle>{t("providerHealth.denied.title")}</EmptyStateTitle>
        <EmptyStateDescription>{t("providerHealth.denied.description")}</EmptyStateDescription>
      </EmptyStateCopy>
    </EmptyState>
  );
}

function ProviderHealthSkeleton({ label }: { readonly label: string }) {
  return (
    <div aria-busy="true" aria-label={label} role="status" {...applyStyles(styles.kpis)}>
      <Skeleton {...applyStyles(styles.kpiSkeleton)} />
      <Skeleton {...applyStyles(styles.kpiSkeleton)} />
      <Skeleton {...applyStyles(styles.kpiSkeleton)} />
      <Skeleton {...applyStyles(styles.kpiSkeleton)} />
    </div>
  );
}

function ProviderHealthContent({ view }: { readonly view: ProviderHealthView }) {
  const { locale, t } = useI18n();
  const numbers = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" });
  const formatPercent = (value: number | null) => (value === null ? null : percent.format(value));
  const formatDate = (value: Date | null, fallback: string) =>
    value === null ? fallback : dateTime.format(value);

  return (
    <>
      <div {...applyStyles(styles.statusRow)}>
        <Badge variant={providerStatusBadgeVariant(view.status)}>
          {t("providerHealth.status.label")}: {t(`providerHealth.status.${view.status}`)}
        </Badge>
        <Badge variant={circuitStateBadgeVariant(view.circuitState)}>
          {t("providerHealth.circuit.label")}: {t(`providerHealth.circuit.${view.circuitState}`)}
        </Badge>
      </div>

      {view.empty ? (
        <EmptyState>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("providerHealth.empty.title")}</EmptyStateTitle>
            <EmptyStateDescription>{t("providerHealth.empty.description")}</EmptyStateDescription>
          </EmptyStateCopy>
        </EmptyState>
      ) : (
        <>
          <section aria-label={t("providerHealth.metrics")}>
            <StatGroup className={styles.kpis}>
              <Kpi
                icon={ListNumbersIcon}
                label={t("providerHealth.metric.sample")}
                value={numbers.format(view.sampleSize)}
              />
              <Kpi
                icon={PulseIcon}
                label={t("providerHealth.metric.successRate")}
                value={formatPercent(view.successRate)}
              />
              <Kpi
                icon={GaugeIcon}
                label={t("providerHealth.metric.latency")}
                value={
                  view.averageLatencyMs === null
                    ? null
                    : `${numbers.format(view.averageLatencyMs)} ${t("providerHealth.metric.unit.ms")}`
                }
              />
              <Kpi
                icon={HardDrivesIcon}
                label={t("providerHealth.metric.cacheHitRate")}
                value={formatPercent(view.cacheHitRate)}
              />
            </StatGroup>
          </section>

          <div {...applyStyles(styles.sections)}>
            <section {...applyStyles(styles.section)}>
              <SectionTitle>{t("providerHealth.calls.title")}</SectionTitle>
              <MetaList columns={2}>
                <Detail
                  label={t("providerHealth.calls.success")}
                  value={numbers.format(view.successCount)}
                />
                <Detail
                  label={t("providerHealth.calls.failure")}
                  value={numbers.format(view.failureCount)}
                />
                <Detail
                  label={t("providerHealth.calls.lastSuccess")}
                  value={formatDate(view.lastSuccessfulAt, t("providerHealth.calls.never"))}
                />
                <Detail
                  label={t("providerHealth.calls.lastFailure")}
                  value={formatDate(view.lastFailureAt, t("providerHealth.calls.never"))}
                />
              </MetaList>
            </section>

            <section {...applyStyles(styles.section)}>
              <SectionTitle>{t("providerHealth.cache.title")}</SectionTitle>
              <MetaList columns={2}>
                <Detail
                  label={t("providerHealth.cache.hits")}
                  value={numbers.format(view.cache.hits)}
                />
                <Detail
                  label={t("providerHealth.cache.misses")}
                  value={numbers.format(view.cache.misses)}
                />
                <Detail
                  label={t("providerHealth.cache.stale")}
                  value={numbers.format(view.cache.stale)}
                />
              </MetaList>
            </section>

            <section {...applyStyles(styles.section)}>
              <SectionTitle>{t("providerHealth.failures.title")}</SectionTitle>
              {view.failureCount === 0 ? (
                <p {...applyStyles(styles.muted)}>{t("providerHealth.failures.none")}</p>
              ) : (
                <Alert variant="warning">
                  <AlertDescription>{t("providerHealth.failures.some")}</AlertDescription>
                </Alert>
              )}
            </section>

            <section {...applyStyles(styles.section)}>
              <SectionTitle>{t("providerHealth.window.title")}</SectionTitle>
              <MetaList columns={2}>
                <Detail
                  label={t("providerHealth.window.startedAt")}
                  value={dateTime.format(view.windowStartedAt)}
                />
                <Detail
                  label={t("providerHealth.window.observedAt")}
                  value={dateTime.format(view.observedAt)}
                />
              </MetaList>
            </section>
          </div>
        </>
      )}
    </>
  );
}

function Detail({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <MetaItem>
      <MetaTerm>{label}</MetaTerm>
      <MetaValue>{value}</MetaValue>
    </MetaItem>
  );
}

function Kpi({
  icon: Glyph,
  label,
  value,
}: {
  readonly icon: Icon;
  readonly label: string;
  readonly value: string | null;
}) {
  const { t } = useI18n();
  return (
    <Stat className={styles.panel}>
      <div {...applyStyles(styles.stack)}>
        <span aria-hidden {...applyStyles(styles.iconCell)}>
          <Glyph aria-hidden size={KPI_ICON_SIZE} {...applyStyles(styles.icon)} />
        </span>
        <div {...applyStyles(styles.textCol)}>
          <StatLabel>{label}</StatLabel>
          <MetricStatValue
            emptyLabel={t("providerHealth.metric.unavailable")}
            size="default"
            value={value}
          />
        </div>
      </div>
    </Stat>
  );
}
