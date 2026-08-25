import * as stylex from "@stylexjs/stylex";
import { colors, media } from "@futrob/ui";

export const styles = stylex.create({
  frame: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "var(--corner-2xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  canvas: {
    position: "relative",
    aspectRatio: {
      default: "4 / 5",
      [media.sm]: "4 / 3",
    },
  },
  stage: {
    position: "absolute",
    top: {
      default: "1rem",
      [media.sm]: "1.5rem",
    },
    right: {
      default: "1rem",
      [media.sm]: "1.5rem",
    },
    bottom: {
      default: "1rem",
      [media.sm]: "1.5rem",
    },
    left: {
      default: "1rem",
      [media.sm]: "1.5rem",
    },
  },
  qf1: {
    left: "6%",
    top: "4%",
    width: "21%",
  },
  qf2: {
    left: "6%",
    top: "20%",
    width: "21%",
  },
  qf3: {
    left: "6%",
    top: "38%",
    width: "21%",
  },
  qf4: {
    left: "6%",
    top: "54%",
    width: "21%",
  },
  sfTop: {
    left: {
      default: "6%",
      [media.sm]: "34%",
    },
    top: {
      default: "7%",
      [media.sm]: "7.5%",
    },
    width: {
      default: "40%",
      [media.sm]: "30%",
    },
  },
  sfBottom: {
    left: {
      default: "6%",
      [media.sm]: "34%",
    },
    top: {
      default: "36%",
      [media.sm]: "41.5%",
    },
    width: {
      default: "40%",
      [media.sm]: "30%",
    },
  },
  final: {
    left: {
      default: "54%",
      [media.sm]: "71%",
    },
    top: {
      default: "16%",
      [media.sm]: "22%",
    },
    width: {
      default: "40%",
      [media.sm]: "23%",
    },
  },
  pipeline: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    margin: 0,
    listStyleType: "none",
    padding: 0,
  },
  pipelineItem: {
    position: "absolute",
    display: "flex",
    transform: "translate(-50%, -50%)",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
  },
  pipelineDot: {
    width: "0.5rem",
    height: "0.5rem",
    borderRadius: "var(--corner-full)",
    boxShadow: "0 0 0 2px var(--surface)",
  },
  pipelineDotSync: {
    backgroundColor: colors.info,
  },
  pipelineDotSelection: {
    backgroundColor: colors.warning,
  },
  pipelineDotApproval: {
    backgroundColor: colors.approved,
  },
  pipelineDotPublication: {
    backgroundColor: colors.foreground,
  },
  pipelineLabel: {
    whiteSpace: "nowrap",
    color: colors.mutedForeground,
    fontSize: {
      default: null,
      [media.sm]: "var(--typo-label-size)",
    },
    fontWeight: {
      default: null,
      [media.sm]: "var(--typo-label-weight)",
    },
    lineHeight: {
      default: null,
      [media.sm]: "var(--typo-label-leading)",
    },
    letterSpacing: {
      default: null,
      [media.sm]: "var(--typo-label-tracking)",
    },
  },
  linesMobile: {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: {
      default: "block",
      [media.sm]: "none",
    },
  },
  linesDesktop: {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: {
      default: "none",
      [media.sm]: "block",
    },
  },
  qfCard: {
    position: "absolute",
    display: {
      default: "none",
      [media.sm]: "block",
    },
    borderRadius: "var(--corner-md)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingInline: "0.375rem",
    paddingBlock: "0.25rem",
  },
  qfList: {
    display: "grid",
    gap: "0.125rem",
  },
  sfCard: {
    position: "absolute",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: "0.5rem",
  },
  sfHeader: {
    display: "flex",
    minHeight: "1.5rem",
    gap: "0.25rem",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sfHeaderWithBadge: {
    display: "flex",
    minHeight: "1.5rem",
    gap: {
      default: "0.25rem",
      [media.sm]: "0.375rem",
    },
    flexDirection: {
      default: "column",
      [media.sm]: "row",
    },
    alignItems: {
      default: "flex-start",
      [media.sm]: "center",
    },
    justifyContent: {
      default: null,
      [media.sm]: "space-between",
    },
  },
  mutedCaption: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.mutedForeground,
  },
  shrink: {
    flexShrink: 0,
  },
  sfList: {
    marginTop: "0.375rem",
    display: "grid",
    gap: "0.25rem",
  },
  finalCard: {
    position: "absolute",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in oklab, var(--primary) 40%, transparent)",
    backgroundColor: colors.surface,
    padding: "0.625rem",
  },
  finalHeader: {
    display: "flex",
    minHeight: "1.5rem",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.375rem",
  },
  finalScore: {
    marginTop: "0.5rem",
    textAlign: "center",
    fontSize: "1.5rem",
    lineHeight: "2rem",
    fontWeight: 600,
    letterSpacing: "var(--tracking-tight)",
    fontVariantNumeric: "tabular-nums",
  },
  finalTeams: {
    marginTop: "0.375rem",
    display: "grid",
    gap: "0.25rem",
  },
  finalTeam: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: "0.375rem",
  },
  crestSm: {
    width: "0.875rem",
    height: "0.875rem",
  },
  crestMd: {
    width: "1rem",
    height: "1rem",
  },
  finalTeamName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    fontWeight: 600,
  },
  finalTeamMuted: {
    color: colors.mutedForeground,
  },
  teamRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.375rem",
  },
  teamIdentity: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.375rem",
  },
  teamName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.75rem",
    lineHeight: "1rem",
  },
  teamNameWinner: {
    fontWeight: 600,
    color: colors.foreground,
  },
  teamNameQuiet: {
    color: colors.mutedForeground,
  },
  teamGoals: {
    flexShrink: 0,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    fontSize: "0.75rem",
    lineHeight: "1rem",
  },
  teamGoalsWinner: {
    color: colors.foreground,
  },
  teamGoalsQuiet: {
    color: colors.mutedForeground,
  },
});
