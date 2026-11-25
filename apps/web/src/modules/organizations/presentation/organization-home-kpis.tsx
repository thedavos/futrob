"use client";

import { NotePencilIcon, TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  HomeKpiGroup,
  HomeKpiSkeletonGroup,
  HomeKpiStat,
} from "@/shared/presentation/stats/home-kpi.tsx";

export type OrganizationHomeMetric = number | "loading" | "unavailable";

function formatMetric(
  metric: OrganizationHomeMetric,
  numberFormat: Intl.NumberFormat,
): string | null {
  if (metric === "loading" || metric === "unavailable") {
    return null;
  }
  return numberFormat.format(metric);
}

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
    return <HomeKpiSkeletonGroup columns={3} label={t("org.home.summary")} />;
  }

  const emptyLabel = t("player.noData");

  return (
    <section aria-label={t("org.home.summary")}>
      <HomeKpiGroup columns={3}>
        <HomeKpiStat
          emptyLabel={emptyLabel}
          icon={TrophyIcon}
          label={t("org.home.kpi.active")}
          loading={active === "loading"}
          value={formatMetric(active, numberFormat)}
        />
        <HomeKpiStat
          emptyLabel={emptyLabel}
          icon={UsersThreeIcon}
          label={t("org.home.kpi.teams")}
          loading={teams === "loading"}
          value={formatMetric(teams, numberFormat)}
        />
        <HomeKpiStat
          emptyLabel={emptyLabel}
          icon={NotePencilIcon}
          label={t("org.home.kpi.drafts")}
          loading={drafts === "loading"}
          value={formatMetric(drafts, numberFormat)}
        />
      </HomeKpiGroup>
    </section>
  );
}
