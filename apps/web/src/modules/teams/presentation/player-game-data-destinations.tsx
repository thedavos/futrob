"use client";

import { Link } from "@tanstack/react-router";
import { ChartBarIcon, SoccerBallIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, LeadCard, TextLink } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const ICON_SIZE = 32;

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
    minHeight: "min-content",
    alignSelf: "stretch",
  },
  icon: {
    display: "block",
    width: "2rem",
    height: "2rem",
  },
});

const icon = applyStyles(styles.icon);

export function GameDataDestinations() {
  const { t } = useI18n();

  return (
    <div {...applyStyles(styles.stack)}>
      <LeadCard
        action={
          <TextLink render={<Link to="/player/matches" />} text="caption">
            {t("player.gameData.matches.cta")}
          </TextLink>
        }
        icon={<SoccerBallIcon aria-hidden size={ICON_SIZE} {...icon} />}
        subtitle={t("player.gameData.matches.subtitle")}
        title={t("player.nav.matches")}
      />
      <LeadCard
        action={
          <TextLink render={<Link to="/player/statistics" />} text="caption">
            {t("player.gameData.statistics.cta")}
          </TextLink>
        }
        icon={<ChartBarIcon aria-hidden size={ICON_SIZE} {...icon} />}
        subtitle={t("player.gameData.statistics.subtitle")}
        title={t("player.nav.statistics")}
      />
    </div>
  );
}
