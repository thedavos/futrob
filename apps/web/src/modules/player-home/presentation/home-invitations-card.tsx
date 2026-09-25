import { Link } from "@tanstack/react-router";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption, LeadCard, TextLink } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { PlayerHomeInvitationsSlot } from "./player-home-model.ts";

const ICON_SIZE = 32;

const styles = stylex.create({
  icon: {
    display: "block",
    width: "2rem",
    height: "2rem",
  },
  caption: {
    whiteSpace: "pre-line",
  },
});

const icon = applyStyles(styles.icon);

export function HomeInvitationsCard({ slot }: { readonly slot: PlayerHomeInvitationsSlot }) {
  const { t } = useI18n();
  const mark = <EnvelopeSimpleIcon aria-hidden size={ICON_SIZE} {...icon} />;

  switch (slot.kind) {
    case "pending":
      return (
        <LeadCard
          action={
            <TextLink render={<Link to="/invitations" />} text="caption">
              {t("player.home.cta.reviewInvitations")}
            </TextLink>
          }
          icon={mark}
          subtitle={t("player.home.invitations.pendingCount", { count: slot.count })}
          title={t("player.home.invitations.pendingTitle")}
        >
          <Caption className={styles.caption}>
            {t("player.home.invitations.pendingCaption")}
          </Caption>
        </LeadCard>
      );
    case "empty":
      return (
        <LeadCard
          action={
            <TextLink render={<Link to="/invitations" />} text="caption">
              {t("player.home.cta.viewHistory")}
            </TextLink>
          }
          icon={mark}
          subtitle={t("player.home.invitations.emptySubtitle")}
          title={t("player.home.invitations.emptyTitle")}
          tone="muted"
        />
      );
    case "onboarding":
      return (
        <LeadCard
          icon={mark}
          subtitle={t("player.home.invitations.emptySubtitle")}
          title={t("player.home.invitations.emptyTitle")}
          tone="muted"
        />
      );
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}
