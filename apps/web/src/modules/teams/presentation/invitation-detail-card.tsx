"use client";

import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Button,
  Card,
  Eyebrow,
  Separator,
  typography,
  type Icon,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import {
  CalendarBlankIcon,
  ChatCircleTextIcon,
  EnvelopeSimpleIcon,
  IdentificationBadgeIcon,
  InfoIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { statusBadgeFor, type InvitationInboxViewItem } from "./invitation-inbox-model.ts";

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    padding: "1.5rem",
    flexGrow: 1,
  },
  banner: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "1rem",
  },
  bannerCopy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.25rem",
  },
  bannerCrest: {
    width: "3rem",
    height: "3rem",
  },
  bannerClub: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
    fontWeight: 700,
    fontSize: "1.125rem",
    lineHeight: "1.75rem",
  },
  facts: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [media.sm]: "1fr auto 1fr",
    },
    columnGap: "1.5rem",
    rowGap: "1rem",
    alignItems: "stretch",
  },
  factsSeparator: {
    display: {
      default: "none",
      [media.sm]: "block",
    },
  },
  factColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  fact: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    columnGap: "0.75rem",
    alignItems: "flex-start",
  },
  factIcon: {
    display: "flex",
    marginTop: "0.125rem",
    color: colors.mutedForeground,
  },
  factCopy: {
    display: "grid",
    gap: "0.25rem",
    minWidth: 0,
  },
  factLabel: {
    color: colors.mutedForeground,
  },
  factValue: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },
  messageBlock: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    columnGap: "0.75rem",
    alignItems: "flex-start",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    padding: "1rem",
  },
  messageCopy: {
    display: "grid",
    gap: "0.375rem",
    minWidth: 0,
  },
  messageQuote: {
    margin: 0,
    color: colors.mutedForeground,
  },
  note: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    columnGap: "0.75rem",
    alignItems: "flex-start",
    color: colors.mutedForeground,
  },
  noteIcon: {
    display: "flex",
    marginTop: "0.125rem",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginTop: "auto",
  },
});

export function InvitationDetailCard({
  item,
  showActions,
  busy,
  respondFailed,
  onAccept,
  onDecline,
}: Readonly<{
  item: InvitationInboxViewItem;
  showActions: boolean;
  busy: boolean;
  respondFailed: boolean;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
}>) {
  const badge = statusBadgeFor(item.displayStatus);
  const actionable = showActions && item.displayStatus === "pending";
  return (
    <Card {...applyStyles(styles.card)} aria-label={`Detalle de la invitación de ${item.clubName}`}>
      <div {...applyStyles(styles.body)}>
        <div {...applyStyles(styles.banner)}>
          <ClubCrestAvatar
            className={bannerCrest.className}
            imageUrl={item.crestUrl}
            name={item.clubName}
            style={bannerCrest.style}
          />
          <div {...applyStyles(styles.bannerCopy)}>
            <Eyebrow>Invitación a equipo</Eyebrow>
            <span {...applyStyles(styles.bannerClub)}>{item.clubName}</span>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        </div>

        <div {...applyStyles(styles.facts)}>
          <div {...applyStyles(styles.factColumn)}>
            <InvitationFact icon={UserIcon} label="Invitado por" value={item.invitedByName} />
            <InvitationFact
              icon={EnvelopeSimpleIcon}
              label="Destinatario"
              value={item.recipientLabel}
            />
          </div>
          <Separator orientation="vertical" {...applyStyles(styles.factsSeparator)} />
          <div {...applyStyles(styles.factColumn)}>
            <InvitationFact
              icon={IdentificationBadgeIcon}
              label="Rol ofrecido"
              value={item.offeredRoleLabel}
            />
            <InvitationFact icon={CalendarBlankIcon} label="Vence el" value={item.expiresLabel} />
          </div>
        </div>

        {item.message === null ? null : (
          <div {...applyStyles(styles.messageBlock)}>
            <span aria-hidden="true" {...applyStyles(styles.factIcon)}>
              <ChatCircleTextIcon size={20} />
            </span>
            <div {...applyStyles(styles.messageCopy)}>
              <span {...applyStyles(typography.label)}>Mensaje del capitán</span>
              <blockquote {...applyStyles(typography.body, styles.messageQuote)}>
                “{item.message}”
              </blockquote>
            </div>
          </div>
        )}

        {actionable ? (
          <p {...applyStyles(typography.caption, styles.note)}>
            <span aria-hidden="true" {...applyStyles(styles.noteIcon)}>
              <InfoIcon size={16} />
            </span>
            <span>Al aceptar, te unirás al equipo de {item.clubName} en Futrob.</span>
          </p>
        ) : null}

        {respondFailed ? (
          <Alert variant="destructive">
            <AlertDescription>
              No pudimos registrar tu respuesta. Inténtalo de nuevo.
            </AlertDescription>
          </Alert>
        ) : null}

        {actionable ? (
          <div {...applyStyles(styles.actions)}>
            <Button disabled={busy} onClick={() => onAccept(item.invitationId)}>
              Aceptar invitación
            </Button>
            <Button disabled={busy} onClick={() => onDecline(item.invitationId)} variant="outline">
              Rechazar invitación
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

const bannerCrest = applyStyles(styles.bannerCrest);

function InvitationFact({
  icon: FactIcon,
  label,
  value,
}: Readonly<{
  icon: Icon;
  label: string;
  value: string;
}>) {
  return (
    <div {...applyStyles(styles.fact)}>
      <span aria-hidden="true" {...applyStyles(styles.factIcon)}>
        <FactIcon size={20} />
      </span>
      <span {...applyStyles(styles.factCopy)}>
        <span {...applyStyles(typography.label, styles.factLabel)}>{label}</span>
        <span {...applyStyles(typography.body, styles.factValue)}>{value}</span>
      </span>
    </div>
  );
}
