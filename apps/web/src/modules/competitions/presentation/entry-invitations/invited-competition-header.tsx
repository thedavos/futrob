"use client";

import * as stylex from "@stylexjs/stylex";
import type { EntryInvitationPreviewDto, GamePlatformDto } from "@futrob/api-contracts";
import { applyStyles, Badge, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ShieldPlusIcon } from "@phosphor-icons/react";

const styles = stylex.create({
  header: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    gap: "1rem",
  },
  icon: {
    width: "2.5rem",
    height: "2.5rem",
    color: colors.foreground,
  },
  headerText: {
    display: "grid",
    justifyItems: "start",
    gap: "0.375rem",
  },
  title: {
    margin: 0,
    fontSize: "1.25rem",
    lineHeight: "1.75rem",
    fontWeight: 600,
  },
  muted: {
    margin: 0,
    color: colors.mutedForeground,
  },
});

/** The competition a team is invited to: name, organizer, edition and platform. */
export function InvitedCompetitionHeader({
  competition,
  platformLabel,
}: {
  readonly competition: Pick<
    EntryInvitationPreviewDto["competition"],
    "name" | "organizationName" | "gameEdition" | "platform"
  >;
  readonly platformLabel: (platform: GamePlatformDto) => string;
}) {
  return (
    <div {...applyStyles(styles.header)}>
      <ShieldPlusIcon aria-hidden="true" {...applyStyles(styles.icon)} />
      <div {...applyStyles(styles.headerText)}>
        <h2 {...applyStyles(styles.title)}>{competition.name}</h2>
        <p {...applyStyles(typography.caption, styles.muted)}>
          Organiza {competition.organizationName}
        </p>
        <Badge variant="neutral">
          {competition.gameEdition} · {platformLabel(competition.platform)}
        </Badge>
      </div>
    </div>
  );
}
