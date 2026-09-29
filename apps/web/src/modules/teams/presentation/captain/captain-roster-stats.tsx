"use client";

import type { CompetitionTeamManagementDetailResponse } from "@futrob/api-contracts";
import { Stat, StatGroup, StatHint, StatLabel, StatValue } from "@futrob/ui";
import {
  eaPlatformLabel,
  formatProviderGameEdition,
} from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./captain-page.styles.ts";

export function CaptainRosterStats({
  detail,
  showClub = false,
}: Readonly<{ detail: CompetitionTeamManagementDetailResponse; showClub?: boolean }>) {
  const { t } = useI18n();
  const { roster, externalClub } = detail;
  const spotsLeft = Math.max(roster.maxSize - roster.memberCount, 0);
  return (
    <StatGroup className={styles.stats}>
      <Stat>
        <StatLabel>{t("captain.stats.spots")}</StatLabel>
        <StatValue size="compact">
          {roster.memberCount}/{roster.maxSize}
        </StatValue>
        <StatHint>
          {spotsLeft === 0
            ? t("captain.stats.spotsFull")
            : t("captain.stats.spotsLeft", { count: spotsLeft })}
        </StatHint>
      </Stat>
      <Stat>
        <StatLabel>{t("captain.stats.state")}</StatLabel>
        <StatValue size="compact">
          {roster.state === "open" ? t("captain.stats.open") : t("captain.stats.closed")}
        </StatValue>
        <StatHint>
          {roster.state === "open" ? t("captain.stats.openHint") : t("captain.stats.closedHint")}
        </StatHint>
      </Stat>
      {showClub ? (
        <Stat>
          <StatLabel>{t("captain.stats.club")}</StatLabel>
          <StatValue size="compact">
            {externalClub ? externalClub.externalClubName : t("captain.stats.noClub")}
          </StatValue>
          <StatHint>
            {externalClub
              ? `${eaPlatformLabel(externalClub.platform)} · ${formatProviderGameEdition(externalClub.gameEdition)}`
              : t("captain.stats.noClubHint")}
          </StatHint>
        </Stat>
      ) : null}
    </StatGroup>
  );
}
