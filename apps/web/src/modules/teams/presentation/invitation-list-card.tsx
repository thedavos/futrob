"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Card, InputWithIcon, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { CaretRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { statusBadgeFor, type InvitationInboxViewItem } from "./invitation-inbox-model.ts";

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  search: {
    padding: "1rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    flexGrow: 1,
  },
  itemRow: {
    borderBottomWidth: {
      default: 1,
      ":last-child": 0,
    },
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
  },
  item: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
    alignItems: "center",
    columnGap: "0.75rem",
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
    textAlign: "start",
    backgroundColor: {
      default: "transparent",
      ":hover": colors.muted,
      ':is([aria-current="true"])': colors.accent,
    },
    borderWidth: 0,
    cursor: "pointer",
    color: "inherit",
    transitionProperty: "background-color",
    transitionDuration: "var(--duration-normal)",
    outlineOffset: -2,
  },
  crest: {
    width: "2.5rem",
    height: "2.5rem",
  },
  copy: {
    display: "grid",
    minWidth: 0,
    gap: "0.25rem",
  },
  clubName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 700,
  },
  invitationKind: {
    color: colors.mutedForeground,
    fontWeight: 500,
  },
  inviterLine: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.mutedForeground,
    fontWeight: 500,
  },
  inviterName: {
    color: colors.foreground,
    fontWeight: 600,
  },
  meta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.375rem",
  },
  received: {
    color: colors.mutedForeground,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  caret: {
    display: "flex",
    alignSelf: "stretch",
    alignItems: "center",
    color: colors.mutedForeground,
  },
  emptyResults: {
    padding: "1.5rem",
    textAlign: "center",
    color: colors.mutedForeground,
  },
});

export function InvitationListCard({
  items,
  search,
  onSearchChange,
  selectedId,
  onSelect,
}: Readonly<{
  items: readonly InvitationInboxViewItem[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (invitationId: string) => void;
}>) {
  return (
    <Card {...applyStyles(styles.card)} aria-label="Listado de invitaciones">
      <div {...applyStyles(styles.search)}>
        <InputWithIcon
          aria-label="Buscar invitación"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar invitación"
          startIcon={MagnifyingGlassIcon}
          type="search"
          value={search}
        />
      </div>
      {items.length === 0 ? (
        <p {...applyStyles(typography.caption, styles.emptyResults)}>
          Sin resultados para tu búsqueda.
        </p>
      ) : (
        <ul {...applyStyles(styles.list)}>
          {items.map((item) => (
            <InvitationListItem
              key={item.invitationId}
              item={item}
              onSelect={onSelect}
              selected={item.invitationId === selectedId}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

const crest = applyStyles(styles.crest);

function InvitationListItem({
  item,
  selected,
  onSelect,
}: Readonly<{
  item: InvitationInboxViewItem;
  selected: boolean;
  onSelect: (invitationId: string) => void;
}>) {
  const badge = statusBadgeFor(item.displayStatus);
  return (
    <li {...applyStyles(styles.itemRow)}>
      <button
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(item.invitationId)}
        type="button"
        {...applyStyles(styles.item)}
      >
        <ClubCrestAvatar
          className={crest.className}
          imageUrl={item.crestUrl}
          name={item.clubName}
          style={crest.style}
        />
        <span {...applyStyles(styles.copy)}>
          <span {...applyStyles(styles.clubName)}>{item.clubName}</span>
          <span {...applyStyles(typography.caption, styles.invitationKind)}>
            Invitación para unirte al equipo
          </span>
          <span {...applyStyles(typography.caption, styles.inviterLine)}>
            De: <span {...applyStyles(styles.inviterName)}>{item.invitedByName}</span>
            {item.invitedByRoleLabel === null ? null : ` · ${item.invitedByRoleLabel}`}
          </span>
        </span>
        <span {...applyStyles(styles.meta)}>
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <span {...applyStyles(typography.caption, styles.received)}>{item.receivedLabel}</span>
        </span>
        <span aria-hidden="true" {...applyStyles(styles.caret)}>
          <CaretRightIcon size={16} />
        </span>
      </button>
    </li>
  );
}
