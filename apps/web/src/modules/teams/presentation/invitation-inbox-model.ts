import type {
  RosterInvitationInboxItemDto,
  RosterInvitationStatusDto,
  RosterMembershipRoleDto,
} from "@futrob/api-contracts";
import { calendarDaysBetween } from "@futrob/shared-kernel";

/**
 * Estado presentable de una invitación: una invitación `pending` cuya fecha de
 * vencimiento ya pasó se muestra como vencida sin mutar el dominio.
 */
export type InvitationDisplayStatus = "pending" | "accepted" | "declined" | "expired" | "revoked";

export type InvitationStatusBadge = {
  readonly label: string;
  readonly variant: "warning" | "primary" | "destructive" | "neutral";
};

export type InvitationInboxViewItem = {
  readonly invitationId: string;
  readonly clubName: string;
  readonly crestUrl: string | null;
  readonly offeredRoleLabel: string;
  readonly displayStatus: InvitationDisplayStatus;
  readonly invitedByName: string;
  readonly invitedByRoleLabel: string | null;
  readonly recipientLabel: string;
  readonly message: string | null;
  readonly receivedLabel: string;
  readonly expiresLabel: string;
};

export function toInvitationViewItem(
  dto: RosterInvitationInboxItemDto,
  now: Date,
): InvitationInboxViewItem {
  return {
    invitationId: dto.invitationId,
    clubName: dto.clubName,
    crestUrl: dto.crestUrl,
    offeredRoleLabel: rosterRoleLabel(dto.role),
    displayStatus: displayStatusFor(dto.status, dto.expiresAt, now),
    invitedByName: dto.invitedBy.displayName,
    invitedByRoleLabel: dto.invitedBy.role === null ? null : rosterRoleLabel(dto.invitedBy.role),
    recipientLabel: dto.recipientIdentifier ?? "Tu cuenta",
    message: dto.message,
    receivedLabel: receivedLabel(dto.createdAt, now),
    expiresLabel: longDateFormatter.format(new Date(dto.expiresAt)),
  };
}

export function displayStatusFor(
  status: RosterInvitationStatusDto,
  expiresAtIso: string,
  now: Date,
): InvitationDisplayStatus {
  switch (status) {
    case "pending":
      return new Date(expiresAtIso).getTime() <= now.getTime() ? "expired" : "pending";
    case "accepted":
      return "accepted";
    case "declined":
      return "declined";
    case "expired":
      return "expired";
    case "revoked":
      return "revoked";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function statusBadgeFor(status: InvitationDisplayStatus): InvitationStatusBadge {
  switch (status) {
    case "pending":
      return { label: "Pendiente", variant: "warning" };
    case "accepted":
      return { label: "Aceptada", variant: "primary" };
    case "declined":
      return { label: "Rechazada", variant: "destructive" };
    case "expired":
      return { label: "Vencida", variant: "neutral" };
    case "revoked":
      return { label: "Anulada", variant: "neutral" };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function rosterRoleLabel(role: RosterMembershipRoleDto): string {
  switch (role) {
    case "player":
      return "Jugador";
    case "captain":
      return "Capitán";
    case "vice_captain":
      return "Subcapitán";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function filterInvitations(
  items: readonly InvitationInboxViewItem[],
  search: string,
): readonly InvitationInboxViewItem[] {
  const query = search.trim().toLocaleLowerCase("es");
  if (query.length === 0) return items;
  return items.filter(
    (item) =>
      item.clubName.toLocaleLowerCase("es").includes(query) ||
      item.invitedByName.toLocaleLowerCase("es").includes(query),
  );
}

const shortDateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const longDateFormatter = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "Recibida hoy" / "ayer" / "hace N días" hasta 7; después `dd/mm/yy`. */
export function receivedLabel(createdAtIso: string, now: Date): string {
  const created = new Date(createdAtIso);
  const days = calendarDaysBetween(created, now);
  if (days <= 0) return "Recibida hoy";
  if (days === 1) return "Recibida ayer";
  if (days <= 7) return `Recibida hace ${days} días`;
  return `Recibida el ${shortDateFormatter.format(created)}`;
}
