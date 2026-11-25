"use client";

import type { CompetitionTeamManagementDetailResponse } from "@futrob/api-contracts";
import {
  applyStyles,
  Progress,
  ProgressIndicator,
  ProgressTrack,
  Stat,
  StatHint,
  StatLabel,
  StatValue,
} from "@futrob/ui";
import {
  LockSimpleIcon,
  LockSimpleOpenIcon,
  ShieldIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { countTeamCaptains } from "./competition-teams-model.ts";
import { styles } from "./competition-teams-view-detail.styles.ts";

export function TeamDetailStats({
  detail,
}: Readonly<{ detail: CompetitionTeamManagementDetailResponse }>) {
  const { t } = useI18n();
  const rosterOpen = detail.roster.state === "open";
  const spotsLeft = Math.max(detail.roster.maxSize - detail.roster.memberCount, 0);
  const captainsCount = countTeamCaptains(detail.members);

  return (
    <div {...applyStyles(styles.statsStrip)}>
      <div {...applyStyles(styles.statCell)}>
        <UsersThreeIcon aria-hidden="true" {...applyStyles(styles.statIcon)} />
        <Stat className={styles.statStack}>
          <StatLabel>{t("competition.teams.detail.stat.spots")}</StatLabel>
          <StatValue size="compact">
            {detail.roster.memberCount}/{detail.roster.maxSize}
          </StatValue>
          <Progress
            aria-label={t("competition.teams.detail.stat.spots")}
            className={styles.progress}
            max={detail.roster.maxSize}
            value={Math.min(detail.roster.memberCount, detail.roster.maxSize)}
          >
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <StatHint>
            {spotsLeft === 0
              ? t("competition.teams.detail.stat.spotsFull")
              : spotsLeft === 1
                ? t("competition.teams.detail.stat.spotsLeftOne")
                : t("competition.teams.detail.stat.spotsLeft", { count: spotsLeft })}
          </StatHint>
        </Stat>
      </div>

      <div {...applyStyles(styles.statCell)}>
        {rosterOpen ? (
          <LockSimpleOpenIcon aria-hidden="true" {...applyStyles(styles.statIcon)} />
        ) : (
          <LockSimpleIcon aria-hidden="true" {...applyStyles(styles.statIcon)} />
        )}
        <Stat className={styles.statStack}>
          <StatLabel>{t("competition.teams.detail.stat.roster")}</StatLabel>
          <StatValue size="compact">
            {rosterOpen
              ? t("competition.teams.detail.stat.rosterOpen")
              : t("competition.teams.detail.stat.rosterClosed")}
          </StatValue>
          <StatHint>
            {rosterOpen
              ? t("competition.teams.detail.stat.rosterOpenHint")
              : t("competition.teams.detail.stat.rosterClosedHint")}
          </StatHint>
        </Stat>
      </div>

      <div {...applyStyles(styles.statCell)}>
        <ShieldIcon aria-hidden="true" {...applyStyles(styles.statIcon)} />
        <Stat className={styles.statStack}>
          <StatLabel>{t("competition.teams.detail.stat.captaincy")}</StatLabel>
          <StatValue size="compact" tone={captainsCount === 0 ? "warning" : "default"}>
            {captainsCount === 0
              ? t("competition.teams.detail.stat.captaincyNone")
              : captainsCount === 1
                ? t("competition.teams.detail.stat.captaincyOne")
                : t("competition.teams.detail.stat.captaincyMany", { count: captainsCount })}
          </StatValue>
          <StatHint>
            {captainsCount === 0
              ? t("competition.teams.detail.stat.captaincyNoneHint")
              : t("competition.teams.detail.stat.captaincyReadyHint")}
          </StatHint>
        </Stat>
      </div>
    </div>
  );
}
