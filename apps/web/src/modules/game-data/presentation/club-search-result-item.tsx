"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { eaPlatformLabel } from "./ea-club-search-meta.ts";

export type ClubSearchResult = {
  readonly name: string;
  readonly imageUrl: string | null;
  readonly platform: string;
  readonly gameEdition: string;
  readonly externalClubId: string;
};

export type ClubSearchResultItemProps = ClubSearchResult & {
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly onSelect?: () => void;
};

export type ClubSearchResultListProps = {
  readonly clubs: readonly ClubSearchResult[];
  readonly selectedExternalClubId?: string | null;
  readonly onSelect?: (club: ClubSearchResult) => void;
  readonly disabled?: boolean;
  readonly "aria-label"?: string;
  readonly "aria-describedby"?: string;
};

const styles = stylex.create({
  list: {
    display: "grid",
    gap: "0.5rem",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  selectableHost: {
    display: "block",
    margin: 0,
    padding: 0,
  },
  item: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.background,
    paddingInline: "0.75rem",
    paddingBlock: "0.5rem",
  },
  itemButton: {
    width: "100%",
    textAlign: "start",
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },
    borderColor: {
      default: colors.borderSubtle,
      ":focus-visible": colors.ring,
      ":is([aria-pressed='true'])": colors.primary,
    },
    backgroundColor: {
      default: colors.background,
      ":hover": colors.muted,
      ":is([aria-pressed='true'])": colors.accent,
      ":is([aria-pressed='true']):hover": colors.accent,
    },
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
    opacity: {
      default: 1,
      ":disabled": 0.6,
    },
  },
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
  },
  identity: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
  },
  avatar: {
    width: "2rem",
    height: "2rem",
  },
  fallback: {
    fontSize: "0.75rem",
    lineHeight: "1rem",
  },
  nameBlock: {
    minWidth: 0,
  },
  name: {
    fontSize: {
      default: "0.875rem",
      [media.sm]: "1rem",
    },
    lineHeight: {
      default: "1.25rem",
      [media.sm]: "1.5rem",
    },
  },
  meta: {
    display: "block",
    marginTop: "0.125rem",
    color: colors.mutedForeground,
  },
  clubId: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    color: colors.mutedForeground,
  },
});

const crest = applyStyles(styles.avatar);
const fallback = applyStyles(styles.fallback);

function ClubSearchResultBody({
  name,
  imageUrl,
  platform,
  gameEdition,
  externalClubId,
}: ClubSearchResult) {
  return (
    <>
      <div {...applyStyles(styles.identity)}>
        <ClubCrestAvatar
          className={crest.className}
          fallbackClassName={fallback.className}
          framed={!imageUrl}
          imageUrl={imageUrl}
          name={name}
          style={crest.style}
        />
        <div {...applyStyles(styles.nameBlock)}>
          <strong {...applyStyles(styles.name)}>{name}</strong>
          <span {...applyStyles(typography.label, styles.meta)}>
            {eaPlatformLabel(platform)} · {gameEdition}
          </span>
        </div>
      </div>
      <span {...applyStyles(styles.clubId)}>{externalClubId}</span>
    </>
  );
}

export function ClubSearchResultItem({
  name,
  imageUrl,
  platform,
  gameEdition,
  externalClubId,
  selected = false,
  disabled = false,
  onSelect,
}: ClubSearchResultItemProps) {
  const body = (
    <ClubSearchResultBody
      externalClubId={externalClubId}
      gameEdition={gameEdition}
      imageUrl={imageUrl}
      name={name}
      platform={platform}
    />
  );

  if (onSelect) {
    return (
      <li {...applyStyles(styles.selectableHost)}>
        <button
          aria-pressed={selected}
          disabled={disabled}
          onClick={onSelect}
          type="button"
          {...applyStyles(styles.item, styles.itemButton)}
        >
          {body}
        </button>
      </li>
    );
  }

  return <li {...applyStyles(styles.item, selected && styles.itemSelected)}>{body}</li>;
}

export function ClubSearchResultList({
  clubs,
  selectedExternalClubId = null,
  onSelect,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: ClubSearchResultListProps) {
  return (
    <ul aria-describedby={ariaDescribedBy} aria-label={ariaLabel} {...applyStyles(styles.list)}>
      {clubs.map((club) => (
        <ClubSearchResultItem
          key={club.externalClubId}
          {...club}
          disabled={disabled}
          onSelect={onSelect ? () => onSelect(club) : undefined}
          selected={club.externalClubId === selectedExternalClubId}
        />
      ))}
    </ul>
  );
}
