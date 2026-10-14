"use client";

import * as stylex from "@stylexjs/stylex";
import { Link } from "@tanstack/react-router";
import type { MyEntryInvitationDto } from "@futrob/api-contracts";
import { applyStyles, Badge, TextLink, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { competitionPlatformLabel } from "../competition-draft-meta.ts";
import { useMyEntryInvitationsQuery } from "../entry-invitation-queries.ts";

const styles = stylex.create({
  section: {
    display: "grid",
    gap: "0.75rem",
  },
  title: {
    margin: 0,
    fontSize: "1rem",
    lineHeight: "1.5rem",
    fontWeight: 600,
  },
  muted: {
    margin: 0,
    color: colors.mutedForeground,
  },
  list: {
    display: "grid",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    minHeight: "3.5rem",
    paddingBlock: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  who: {
    display: "grid",
    minWidth: 0,
    gap: "0.25rem",
    justifyItems: "start",
  },
  name: {
    fontWeight: 600,
  },
});

/** Pending competition invitations addressed to the player. */
export function MyEntryInvitationsList({
  invitations,
  now,
}: {
  readonly invitations: readonly MyEntryInvitationDto[];
  readonly now: Date;
}) {
  const { t } = useI18n();
  const pending = invitations.filter(
    (invitation) =>
      invitation.status === "pending" &&
      (invitation.expiresAt === null || new Date(invitation.expiresAt).getTime() > now.getTime()),
  );
  if (pending.length === 0) return null;
  return (
    <section aria-labelledby="my-entry-invitations" {...applyStyles(styles.section)}>
      <div>
        <h2 id="my-entry-invitations" {...applyStyles(styles.title)}>
          {t("player.invitations.competitions.title")}
        </h2>
        <p {...applyStyles(typography.caption, styles.muted)}>
          {t("player.invitations.competitions.description")}
        </p>
      </div>
      <ul {...applyStyles(styles.list)}>
        {pending.map((invitation) => (
          <li key={invitation.id} {...applyStyles(styles.row)}>
            <span {...applyStyles(styles.who)}>
              <span {...applyStyles(styles.name)}>{invitation.competition.name}</span>
              <Badge variant="neutral">
                {invitation.competition.gameEdition} ·{" "}
                {competitionPlatformLabel(invitation.competition.platform)}
              </Badge>
              {invitation.message ? (
                <span {...applyStyles(typography.caption, styles.muted)}>
                  «{invitation.message}»
                </span>
              ) : null}
            </span>
            <TextLink
              render={
                <Link
                  params={{ invitationId: invitation.id }}
                  to="/entry-invitations/$invitationId"
                />
              }
              text="label"
            >
              {t("player.invitations.competitions.open")}
            </TextLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MyEntryInvitations() {
  const query = useMyEntryInvitationsQuery();
  return <MyEntryInvitationsList invitations={query.data?.invitations ?? []} now={new Date()} />;
}
