import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

/** Shared geometry for the provider-health data layout and its loading skeleton. */
export const styles = stylex.create({
  main: { width: "100%", minWidth: 0 },
  body: { display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" },
  statusRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" },
  kpis: {
    display: "grid",
    width: "100%",
    gap: "1rem",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
  },
  kpiSkeleton: { height: "5.625rem", width: "100%", borderRadius: "var(--corner-lg)" },
  refreshSkeleton: {
    width: "8.25rem",
    maxWidth: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-lg)",
  },
  badgeSkeleton: {
    width: "8.75rem",
    height: "1.5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  badgeSkeletonWide: {
    width: "10.5rem",
    height: "1.5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  metaTermSkeleton: { width: "6.5rem", maxWidth: "100%", height: "1rem" },
  metaValueSkeleton: { width: "7.5rem", maxWidth: "100%", height: "1rem" },
  failureSkeleton: {
    width: "100%",
    height: "4.25rem",
    borderRadius: "var(--corner-lg)",
  },
  panel: {
    height: "100%",
    minWidth: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    padding: "1rem",
    gap: "0.5rem",
  },
  stack: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    minWidth: 0,
    columnGap: "0.75rem",
  },
  iconCell: {
    gridColumn: "1",
    gridRow: "1 / -1",
    alignSelf: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "0.75rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
    color: colors.primary,
  },
  icon: { display: "block", width: "2rem", height: "2rem" },
  textCol: {
    gridColumn: "2",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "0.25rem",
  },
  sections: {
    display: "grid",
    gap: "1.5rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "repeat(2, minmax(0, 1fr))",
    },
  },
  section: { display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 },
  muted: { color: colors.mutedForeground, fontSize: "0.875rem", lineHeight: "1.25rem" },
});
