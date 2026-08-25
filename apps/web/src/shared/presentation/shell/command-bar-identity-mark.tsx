"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { EaLogo } from "@/shared/presentation/ea-logo.tsx";
import { commandBarIdentityLabel, type CommandBarIdentity } from "./command-bar-identity.ts";

/** Ink bounds of `EaLogo` (24×24 viewBox), cropped so the wordmark can size to cap-height. */
const EA_WORDMARK_VIEW_BOX = "0 6 24 12";

const styles = stylex.create({
  root: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
    overflow: "hidden",
  },
  gamertag: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.375rem",
    fontSize: "0.875rem",
    lineHeight: 1,
    fontWeight: 600,
  },
  eaLogo: {
    display: "block",
    height: {
      default: "0.72em",
      "@supports (height: 1cap)": "1cap",
    },
    width: "auto",
    flexShrink: 0,
    color: colors.foreground,
  },
  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  slash: {
    display: "flex",
    alignItems: "center",
    fontSize: "0.875rem",
    lineHeight: 1,
    color: colors.mutedForeground,
  },
  club: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.375rem",
    lineHeight: 1,
  },
  crest: {
    width: "1.25rem",
    height: "1.25rem",
  },
  clubName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 500,
    lineHeight: 1,
    color: colors.mutedForeground,
  },
  empty: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.mutedForeground,
  },
});

export function CommandBarIdentityMark({
  emptyLabel,
  identity,
  ready = true,
}: {
  readonly emptyLabel: string;
  readonly identity: CommandBarIdentity;
  readonly ready?: boolean;
}) {
  const label = commandBarIdentityLabel(identity, emptyLabel);
  if (!ready) return null;

  const hasGamertag = Boolean(identity.gamertag);
  const hasClub = Boolean(identity.clubName);
  const logo = applyStyles(styles.eaLogo);
  const crest = applyStyles(styles.crest);

  return (
    <p title={label} {...applyStyles(styles.root)}>
      {hasGamertag ? (
        <span {...applyStyles(styles.gamertag)}>
          <EaLogo className={logo.className} style={logo.style} viewBox={EA_WORDMARK_VIEW_BOX} />
          <span {...applyStyles(styles.truncate)}>{identity.gamertag}</span>
        </span>
      ) : null}
      {hasGamertag && hasClub ? (
        <span aria-hidden="true" {...applyStyles(styles.slash)}>
          /
        </span>
      ) : null}
      {hasClub ? (
        <span {...applyStyles(styles.club)}>
          <ClubCrestAvatar
            className={crest.className}
            imageUrl={identity.imageUrl}
            name={identity.clubName ?? emptyLabel}
            style={crest.style}
          />
          <span {...applyStyles(typography.caption, styles.clubName)}>{identity.clubName}</span>
        </span>
      ) : null}
      {!hasGamertag && !hasClub ? (
        <span {...applyStyles(typography.caption, styles.empty)}>{emptyLabel}</span>
      ) : null}
    </p>
  );
}
