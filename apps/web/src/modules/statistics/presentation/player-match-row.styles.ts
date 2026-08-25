import * as stylex from "@stylexjs/stylex";
import { elevation, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
export const styles = stylex.create({
  item: {
    position: "relative",
  },
  card: {
    containerType: "inline-size",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  body: {
    position: "relative",
    display: "flex",
    minHeight: "13rem",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    paddingInline: {
      default: "1rem",
      "@container (min-width: 32rem)": "1.5rem",
    },
    paddingBlock: {
      default: "1rem",
      "@container (min-width: 32rem)": "1.5rem",
    },
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
  },
  headerOpen: {
    justifyContent: "space-between",
  },
  onPitchSurface: {
    backgroundColor: colors.surface,
  },
  outcome: {
    fontWeight: 600,
  },
  muted: {
    color: colors.mutedForeground,
  },
  medium: {
    fontWeight: 500,
  },
  dnf: {
    display: "inline-flex",
    color: colors.mutedForeground,
  },
  dnfIcon: {
    width: "0.875rem",
    height: "0.875rem",
  },
  when: {
    fontVariantNumeric: "tabular-nums",
    color: colors.mutedForeground,
  },
  chevron: {
    flexShrink: 0,
  },
  center: {
    display: "flex",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  scoreRow: {
    marginInline: "auto",
    display: "flex",
    width: "fit-content",
    maxWidth: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: {
      default: "1rem",
      "@container (min-width: 32rem)": "4rem",
    },
  },
  scoreStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
  },
  score: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.625rem",
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.foreground,
    paddingInline: "0.875rem",
    paddingBlock: "0.625rem",
    color: colors.background,
  },
  scoreDigit: {
    fontVariantNumeric: "tabular-nums",
  },
  scoreLead: {
    color: {
      default: "var(--brand-300)",
      ":is(.dark *)": colors.primary,
      ':is([data-theme="dark"] *)': colors.primary,
    },
  },
  scoreTrail: {
    color: colors.background,
  },
  vs: {
    paddingInline: "0.125rem",
    lineHeight: 1,
  },
  featRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  meta: {
    display: "flex",
    minWidth: 0,
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: "0.5rem",
    rowGap: "0.25rem",
  },
  club: {
    display: "flex",
    width: {
      default: "6rem",
      "@container (min-width: 32rem)": "9rem",
    },
    minWidth: 0,
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
  },
  crest: {
    width: {
      default: "4rem",
      "@container (min-width: 32rem)": "6rem",
    },
    height: {
      default: "4rem",
      "@container (min-width: 32rem)": "6rem",
    },
    flexShrink: 0,
  },
  crestFallback: {
    fontSize: "1rem",
  },
  clubMeta: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    alignItems: "center",
    gap: "0.125rem",
    textAlign: "center",
  },
  clubName: {
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textWrap: "nowrap",
    textAlign: "center",
    color: colors.mutedForeground,
    whiteSpace: "nowrap",
  },
  clubNameText: {
    fontWeight: 600,
  },
  red: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.125rem",
    fontVariantNumeric: "tabular-nums",
    color: colors.danger,
  },
  redIcon: {
    width: "0.75rem",
    height: "0.75rem",
    transform: "rotate(84deg)",
    color: colors.danger,
  },
  featTrigger: {
    display: "inline-flex",
    maxWidth: "100%",
  },
});

export const rowTypography = {
  caption: typography.caption,
  subtitle: typography.subtitle,
  score: typography.score,
};

export const rowElevation = {
  score: elevation.md,
};
