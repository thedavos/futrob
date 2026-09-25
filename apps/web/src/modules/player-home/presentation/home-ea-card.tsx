import { Link } from "@tanstack/react-router";
import { CheckCircleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption, LeadCard, TextLink } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { EaLogo } from "@/shared/presentation/ea-logo.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { PlayerHomeEaSlot } from "./player-home-model.ts";

const styles = stylex.create({
  identity: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "0.25rem",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  logo: {
    display: "block",
    width: "2rem",
    height: "2rem",
  },
  check: {
    color: colors.primary,
  },
  gamertag: {
    fontWeight: 600,
  },
});

export function HomeEaCard({ slot }: { readonly slot: PlayerHomeEaSlot }) {
  const { t } = useI18n();
  const icon = <EaLogo {...applyStyles(styles.logo)} />;

  switch (slot.kind) {
    case "linked":
      return (
        <LeadCard icon={icon} title={t("player.home.ea.linkedTitle")}>
          <div {...applyStyles(styles.identity)}>
            <div {...applyStyles(styles.row)}>
              <span {...applyStyles(styles.gamertag)}>{slot.gamertag}</span>
              <CheckCircleIcon aria-hidden size={20} weight="fill" {...applyStyles(styles.check)} />
            </div>
            <Caption>{t("player.home.ea.linkedCaption")}</Caption>
            <Caption>{t("player.home.ea.linkedHint")}</Caption>
          </div>
        </LeadCard>
      );
    case "unlinked":
      return (
        <LeadCard
          action={
            <TextLink render={<Link to="/player/game-accounts" />} text="caption">
              {t("player.home.cta.linkEa")}
            </TextLink>
          }
          icon={icon}
          subtitle={t("player.home.ea.unlinkedSubtitle")}
          title={t("player.home.ea.unlinkedTitle")}
        />
      );
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}
