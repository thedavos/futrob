"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption } from "@futrob/ui";
import { ClockCountdownIcon, LinkIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  HomeKpiGroup,
  HomeKpiSkeletonGroup,
  HomeKpiStat,
} from "@/shared/presentation/stats/home-kpi.tsx";
import type { CompetitionTeamsSummary } from "./competition-teams-model.ts";

const styles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
});

export function CompetitionTeamsKpis({
  summary,
  loading,
  partial,
}: Readonly<{
  summary: CompetitionTeamsSummary;
  loading?: boolean;
  partial?: boolean;
}>) {
  const { locale, t } = useI18n();
  if (loading) {
    return <HomeKpiSkeletonGroup columns={3} label={t("competition.teams.kpi.loading")} />;
  }

  const numberFormat = new Intl.NumberFormat(locale);
  const emptyLabel = t("player.noData");

  return (
    <section aria-label={t("competition.teams.kpi.summary")} {...applyStyles(styles.section)}>
      <HomeKpiGroup columns={3}>
        <HomeKpiStat
          emptyLabel={emptyLabel}
          icon={UsersThreeIcon}
          label={t("competition.teams.kpi.total")}
          value={numberFormat.format(summary.approved)}
        />
        <HomeKpiStat
          emptyLabel={emptyLabel}
          icon={ClockCountdownIcon}
          label={t("competition.teams.kpi.pending")}
          value={numberFormat.format(summary.pending)}
        />
        <HomeKpiStat
          emptyLabel={emptyLabel}
          icon={LinkIcon}
          label={t("competition.teams.kpi.noClub")}
          value={numberFormat.format(summary.noClub)}
        />
      </HomeKpiGroup>
      {partial ? (
        <Caption>{t("competition.teams.kpi.partialScope", { count: summary.loaded })}</Caption>
      ) : null}
    </section>
  );
}
