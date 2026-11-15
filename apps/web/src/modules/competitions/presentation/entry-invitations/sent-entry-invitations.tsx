"use client";

import * as stylex from "@stylexjs/stylex";
import type { SentEntryInvitationDto } from "@futrob/api-contracts";
import { Alert, AlertDescription, applyStyles, Badge, Button, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";

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
  list: {
    display: "grid",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  row: {
    display: "grid",
    alignItems: "center",
    gap: "0.75rem",
    minHeight: "3.5rem",
    paddingBlock: "0.5rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    gridTemplateColumns: "minmax(0, 1fr) auto auto",
  },
  who: {
    display: "grid",
    minWidth: 0,
  },
  name: {
    overflow: "hidden",
    fontWeight: 600,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  muted: {
    margin: 0,
    color: colors.mutedForeground,
  },
});

type SentStatus = "pending" | "accepted" | "declined" | "revoked" | "expired";

const STATUS_BADGES = {
  pending: { label: "Pendiente", variant: "warning" },
  accepted: { label: "Aceptada", variant: "neutral" },
  declined: { label: "Rechazada", variant: "destructive" },
  revoked: { label: "Revocada", variant: "outline" },
  expired: { label: "Caducada", variant: "outline" },
} as const satisfies Readonly<Record<SentStatus, { label: string; variant: string }>>;

function sentStatus(invitation: SentEntryInvitationDto, now: Date): SentStatus {
  if (
    invitation.status === "pending" &&
    invitation.expiresAt !== null &&
    new Date(invitation.expiresAt).getTime() <= now.getTime()
  ) {
    return "expired";
  }
  return invitation.status;
}

/** Directed invitations the organizer sent for the competition, with revoke. */
export function SentEntryInvitations({
  invitations,
  now,
  disabled,
  revokeFailed,
  onRevoke,
}: {
  readonly invitations: readonly SentEntryInvitationDto[];
  readonly now: Date;
  readonly disabled: boolean;
  readonly revokeFailed: boolean;
  readonly onRevoke: (invitationId: string) => void;
}) {
  if (invitations.length === 0) return null;
  const pending = invitations.filter(
    (invitation) => sentStatus(invitation, now) === "pending",
  ).length;
  return (
    <section aria-labelledby="sent-entry-invitations" {...applyStyles(styles.section)}>
      <div>
        <h3 id="sent-entry-invitations" {...applyStyles(styles.title)}>
          Invitaciones enviadas
        </h3>
        <p {...applyStyles(typography.caption, styles.muted)}>
          {pending === 1 ? "1 pendiente de respuesta" : `${pending} pendientes de respuesta`}
        </p>
      </div>
      {revokeFailed ? (
        <Alert variant="destructive">
          <AlertDescription>No se pudo revocar la invitación. Inténtalo de nuevo.</AlertDescription>
        </Alert>
      ) : null}
      <ul {...applyStyles(styles.list)}>
        {invitations.map((invitation) => {
          const status = sentStatus(invitation, now);
          const badge = STATUS_BADGES[status];
          const label = invitation.inviteeLabel ?? "Jugador";
          return (
            <li key={invitation.id} {...applyStyles(styles.row)}>
              <span {...applyStyles(styles.who)}>
                <span {...applyStyles(styles.name)}>{label}</span>
                {invitation.message ? (
                  <span {...applyStyles(typography.caption, styles.muted)}>
                    «{invitation.message}»
                  </span>
                ) : null}
              </span>
              <Badge data-invitation-status={status} variant={badge.variant}>
                {badge.label}
              </Badge>
              {status === "pending" ? (
                <Button
                  aria-label={`Revocar invitación de ${label}`}
                  disabled={disabled}
                  onClick={() => onRevoke(invitation.id)}
                  type="button"
                  variant="ghost"
                >
                  Revocar
                </Button>
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
