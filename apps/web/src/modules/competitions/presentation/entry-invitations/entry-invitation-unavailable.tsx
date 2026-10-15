"use client";

import { useId, type ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@futrob/ui";
import accessUrl from "@/assets/illustration-permissions.png";
import closedUrl from "@/assets/illustration-registration.png";
import answeredUrl from "@/assets/illustration-invitations.png";

/** Why an invitation can no longer be used; each has its own illustration and next step. */
export type EntryInvitationUnavailableReason =
  | "invalid"
  | "expired"
  | "forbidden"
  | "closed"
  | "answered";

const PRESENTATION = {
  invalid: {
    illustration: accessUrl,
    title: "Esta invitación ya no funciona",
    description:
      "El organizador la desactivó o cambió el enlace. Pide una invitación nueva a quien te la compartió.",
  },
  expired: {
    illustration: accessUrl,
    title: "Esta invitación caducó",
    description: "Las invitaciones directas duran 14 días. Pide una nueva al organizador.",
  },
  forbidden: {
    illustration: accessUrl,
    title: "Esta invitación es para otro jugador",
    description: "Inicia sesión con la cuenta que recibió la invitación para responderla.",
  },
  closed: {
    illustration: closedUrl,
    title: "Las inscripciones están cerradas",
    description:
      "Esta competición ya no admite equipos nuevos. Si crees que es un error, habla con el organizador.",
  },
  answered: {
    illustration: answeredUrl,
    title: "Ya respondiste esta invitación",
    description: "Tus invitaciones y equipos aparecen en tu espacio de jugador.",
  },
} as const satisfies Record<
  EntryInvitationUnavailableReason,
  { illustration: string; title: string; description: string }
>;

const REASON_BY_CODE = new Map<string, EntryInvitationUnavailableReason>([
  ["competitions.entry_invitation_not_found", "invalid"],
  ["competitions.entry_invitation_revoked", "invalid"],
  ["competitions.entry_invitation_expired", "expired"],
  ["competitions.entry_invitation_forbidden", "forbidden"],
  ["competitions.not_editable", "closed"],
  ["competitions.entry_invitation_already_decided", "answered"],
]);

/** The reason behind a failed invitation request, or `null` when it may succeed on retry. */
export function entryInvitationUnavailableReason(
  code: string | null,
): EntryInvitationUnavailableReason | null {
  return code === null ? null : (REASON_BY_CODE.get(code) ?? null);
}

const styles = stylex.create({
  illustration: {
    width: "8rem",
    height: "8rem",
    objectFit: "contain",
  },
});

/** An invitation that can no longer be used, with a way out of the page. */
export function EntryInvitationUnavailable({
  reason,
  action,
}: {
  readonly reason: EntryInvitationUnavailableReason;
  readonly action: ReactNode;
}) {
  const titleId = useId();
  const copy = PRESENTATION[reason];
  return (
    <EmptyState aria-labelledby={titleId}>
      <EmptyStateIcon>
        <img
          alt=""
          data-outline="none"
          src={copy.illustration}
          {...applyStyles(styles.illustration)}
        />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle id={titleId}>{copy.title}</EmptyStateTitle>
        <EmptyStateDescription>{copy.description}</EmptyStateDescription>
      </EmptyStateCopy>
      <EmptyStateActions>{action}</EmptyStateActions>
    </EmptyState>
  );
}
