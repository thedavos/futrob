import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

/** Bones sized to the information-step blocks they reserve. */
export const setupSkeleton = stylex.create({
  title: {
    width: "16.5rem",
    maxWidth: "100%",
    height: "2rem",
  },
  badge: {
    width: "5.5rem",
    height: "1.5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  description: {
    width: "24rem",
    maxWidth: "100%",
    height: "1.25rem",
  },
  stepper: {
    width: "100%",
    marginBottom: "2.5rem",
  },
  stepperList: {
    display: "flex",
    alignItems: "flex-start",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  stepperItem: {
    position: "relative",
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
  },
  stepperConnector: {
    position: "absolute",
    left: "50%",
    top: "0.875rem",
    height: 1,
    width: "100%",
    backgroundColor: colors.border,
  },
  stepperMarker: {
    width: "1.75rem",
    height: "1.75rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  stepperLabel: {
    width: "4.5rem",
    maxWidth: "100%",
    height: "0.75rem",
    display: {
      default: null,
      [media.maxSm]: "none",
    },
  },
  stepperSummary: {
    width: "10rem",
    maxWidth: "100%",
    height: "0.75rem",
    marginTop: "0.75rem",
    marginInline: "auto",
    display: {
      default: "block",
      [media.sm]: "none",
    },
  },
  heading: {
    display: "grid",
    gap: "0.5rem",
  },
  headingTitle: {
    width: "12rem",
    maxWidth: "100%",
    height: "1.5rem",
  },
  headingCopy: {
    width: "16rem",
    maxWidth: "100%",
    height: "1rem",
  },
  headingBadge: {
    width: "4.5rem",
    height: "1.25rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  field: {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    gap: "0.5rem",
  },
  fieldLabel: {
    width: "8rem",
    maxWidth: "70%",
    height: "0.875rem",
  },
  fieldControl: {
    width: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-lg)",
  },
  fieldHint: {
    width: "11rem",
    maxWidth: "90%",
    height: "0.75rem",
  },
  preview: {
    display: "grid",
    justifyItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-lg)",
    padding: "1.5rem 1rem 1.25rem",
    backgroundColor: colors.background,
  },
  artwork: {
    width: "8.5rem",
    height: "8.5rem",
    maxWidth: "100%",
    borderRadius: "var(--corner-md)",
  },
  previewName: {
    width: "8rem",
    maxWidth: "100%",
    height: "1.25rem",
  },
  previewMeta: {
    width: "10rem",
    maxWidth: "100%",
    height: "0.75rem",
  },
  coverLabel: {
    width: "4.5rem",
    height: "0.875rem",
  },
  presets: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "0.5rem",
  },
  preset: {
    width: "100%",
    maxWidth: "4.5rem",
    aspectRatio: "1",
    justifySelf: "center",
    borderRadius: "var(--corner-lg)",
  },
  coverAction: {
    width: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-md)",
  },
  coverCaption: {
    width: "14rem",
    maxWidth: "100%",
    height: "0.75rem",
  },
  identity: {
    display: "grid",
    gap: "1.25rem",
  },
});
