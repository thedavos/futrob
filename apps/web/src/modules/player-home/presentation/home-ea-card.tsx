import { Link } from "@tanstack/react-router";
import { CheckCircleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption, Heading, Subtitle, TextLink } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { EaLogo } from "@/shared/presentation/ea-logo.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HomeCard } from "./home-card.tsx";
import type { PlayerHomeEaSlot } from "./player-home-model.ts";

const styles = stylex.create({
  linked: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    columnGap: "0.75rem",
  },
  logoCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "start",
    padding: "0.75rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
    color: colors.primary,
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "0.25rem",
  },
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
  title: {
    fontWeight: 600,
    fontSize: "var(--text-lg)",
  },
  status: {
    fontWeight: "var(--font-weight-medium)",
  },
  action: {
    fontWeight: "var(--font-weight-medium)",
    marginTop: "0.5rem",
  },
});

export function HomeEaCard({ slot }: { readonly slot: PlayerHomeEaSlot }) {
  const { t } = useI18n();

  switch (slot.kind) {
    case "linked":
      return (
        <HomeCard>
          <div {...applyStyles(styles.linked)}>
            <span aria-hidden {...applyStyles(styles.logoCell)}>
              <EaLogo {...applyStyles(styles.logo)} />
            </span>
            <div {...applyStyles(styles.copy)}>
              <Heading className={styles.title}>{t("player.home.ea.linkedTitle")}</Heading>
              <div {...applyStyles(styles.identity)}>
                <div {...applyStyles(styles.row)}>
                  <span {...applyStyles(styles.gamertag)}>{slot.gamertag}</span>
                  <CheckCircleIcon
                    aria-hidden
                    size={20}
                    weight="fill"
                    {...applyStyles(styles.check)}
                  />
                </div>
                <Caption>{t("player.home.ea.linkedCaption")}</Caption>
                <Caption>{t("player.home.ea.linkedHint")}</Caption>
              </div>
            </div>
          </div>
        </HomeCard>
      );
    case "unlinked":
      return (
        <HomeCard>
          <div {...applyStyles(styles.linked)}>
            <span aria-hidden {...applyStyles(styles.logoCell)}>
              <EaLogo {...applyStyles(styles.logo)} />
            </span>
            <div {...applyStyles(styles.copy)}>
              <Heading className={styles.title}>{t("player.home.ea.unlinkedTitle")}</Heading>
              <Subtitle className={styles.status}>{t("player.home.ea.unlinkedSubtitle")}</Subtitle>
              <TextLink
                className={styles.action}
                render={<Link to="/player/game-accounts" />}
                text="caption"
              >
                {t("player.home.cta.linkEa")}
              </TextLink>
            </div>
          </div>
        </HomeCard>
      );
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}
