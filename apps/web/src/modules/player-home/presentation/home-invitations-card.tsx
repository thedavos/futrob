import { Link } from "@tanstack/react-router";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption, Heading, Subtitle, TextLink } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HomeCard } from "./home-card.tsx";
import type { PlayerHomeInvitationsSlot } from "./player-home-model.ts";

const ICON_SIZE = 32;

const styles = stylex.create({
  linked: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    columnGap: "0.75rem",
  },
  iconCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "start",
    padding: "0.75rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--muted-foreground) 20%, transparent)",
    color: colors.mutedForeground,
  },
  iconCellPending: {
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
  icon: {
    display: "block",
    width: "2rem",
    height: "2rem",
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "0.25rem",
  },
  title: {
    fontWeight: 600,
    fontSize: "var(--text-lg)",
  },
  count: {
    fontWeight: "var(--font-weight-medium)",
  },
  history: {
    fontWeight: "var(--font-weight-medium)",
    marginTop: "0.5rem",
  },
  caption: {
    whiteSpace: "pre-line",
  },
});

export function HomeInvitationsCard({ slot }: { readonly slot: PlayerHomeInvitationsSlot }) {
  const { t } = useI18n();

  switch (slot.kind) {
    case "pending":
      return (
        <HomeCard>
          <div {...applyStyles(styles.linked)}>
            <span aria-hidden {...applyStyles(styles.iconCellPending)}>
              <EnvelopeSimpleIcon aria-hidden size={ICON_SIZE} {...applyStyles(styles.icon)} />
            </span>
            <div {...applyStyles(styles.copy)}>
              <Heading className={styles.title}>
                {t("player.home.invitations.pendingTitle")}
              </Heading>
              <Subtitle className={styles.count}>
                {t("player.home.invitations.pendingCount", { count: slot.count })}
              </Subtitle>
              <Caption className={styles.caption}>
                {t("player.home.invitations.pendingCaption")}
              </Caption>
              <TextLink
                className={styles.history}
                render={<Link to="/invitations" />}
                text="caption"
              >
                {t("player.home.cta.reviewInvitations")}
              </TextLink>
            </div>
          </div>
        </HomeCard>
      );
    case "empty":
    case "onboarding":
      return (
        <HomeCard>
          <div {...applyStyles(styles.linked)}>
            <span aria-hidden {...applyStyles(styles.iconCell)}>
              <EnvelopeSimpleIcon aria-hidden size={ICON_SIZE} {...applyStyles(styles.icon)} />
            </span>
            <div {...applyStyles(styles.copy)}>
              <Heading className={styles.title}>{t("player.home.invitations.emptyTitle")}</Heading>
              <Subtitle>{t("player.home.invitations.emptySubtitle")}</Subtitle>
              {slot.kind === "empty" ? (
                <TextLink
                  className={styles.history}
                  render={<Link to="/invitations" />}
                  text="caption"
                >
                  {t("player.home.cta.viewHistory")}
                </TextLink>
              ) : null}
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
