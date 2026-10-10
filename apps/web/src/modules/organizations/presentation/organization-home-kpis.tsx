"use client";

import type { ReactNode } from "react";
import { NotePencilIcon, TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Skeleton, Stat, StatGroup, StatLabel, type Icon } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";

const KPI_ICON_SIZE = 32;

const styles = stylex.create({
  group: {
    display: "grid",
    width: "100%",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
    },
    columnGap: "1rem",
    rowGap: "1rem",
  },
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
  textCol: {
    gridColumn: "2",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "0.25rem",
  },
  icon: {
    display: "block",
    width: "2rem",
    height: "2rem",
  },
  skeleton: {
    height: "5.625rem",
    width: "100%",
    borderRadius: "var(--corner-lg)",
  },
  valueSkeleton: {
    width: "2.5rem",
    height: "2.25rem",
  },
});

export type OrganizationHomeMetric = number | "loading" | "unavailable";

export function OrganizationHomeKpis({
  active,
  drafts,
  teams,
}: {
  readonly active: OrganizationHomeMetric;
  readonly drafts: OrganizationHomeMetric;
  readonly teams: OrganizationHomeMetric;
}) {
  const { locale, t } = useI18n();
  const numberFormat = new Intl.NumberFormat(locale);
  const loading = active === "loading" && drafts === "loading" && teams === "loading";

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t("org.home.summary")} {...applyStyles(styles.group)}>
        <Skeleton {...applyStyles(styles.skeleton)} />
        <Skeleton {...applyStyles(styles.skeleton)} />
        <Skeleton {...applyStyles(styles.skeleton)} />
      </div>
    );
  }

  return (
    <section aria-label={t("org.home.summary")}>
      <StatGroup className={styles.group}>
        <KpiStat
          icon={<KpiIcon icon={TrophyIcon} />}
          label={t("org.home.kpi.active")}
          metric={active}
          numberFormat={numberFormat}
        />
        <KpiStat
          icon={<KpiIcon icon={UsersThreeIcon} />}
          label={t("org.home.kpi.teams")}
          metric={teams}
          numberFormat={numberFormat}
        />
        <KpiStat
          icon={<KpiIcon icon={NotePencilIcon} />}
          label={t("org.home.kpi.drafts")}
          metric={drafts}
          numberFormat={numberFormat}
        />
      </StatGroup>
    </section>
  );
}

function KpiStat({
  icon,
  label,
  metric,
  numberFormat,
}: {
  readonly icon: ReactNode;
  readonly label: ReactNode;
  readonly metric: OrganizationHomeMetric;
  readonly numberFormat: Intl.NumberFormat;
}) {
  const { t } = useI18n();
  return (
    <Stat className={styles.panel}>
      <div {...applyStyles(styles.stack)}>
        {icon}
        <div {...applyStyles(styles.textCol)}>
          <StatLabel>{label}</StatLabel>
          {metric === "loading" ? (
            <Skeleton {...applyStyles(styles.valueSkeleton)} />
          ) : (
            <MetricStatValue
              emptyLabel={t("player.noData")}
              size="default"
              value={metric === "unavailable" ? null : numberFormat.format(metric)}
            />
          )}
        </div>
      </div>
    </Stat>
  );
}

function KpiIcon({ icon: Glyph }: { readonly icon: Icon }) {
  return (
    <span aria-hidden {...applyStyles(styles.iconCell)}>
      <Glyph aria-hidden size={KPI_ICON_SIZE} {...applyStyles(styles.icon)} />
    </span>
  );
}
