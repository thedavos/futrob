import * as stylex from "@stylexjs/stylex";
import { colors, media } from "@futrob/ui/styles/public.stylex";

export const styles = stylex.create({
  section: {
    display: "grid",
    gap: "1.5rem",
  },
  pair: {
    display: "grid",
    gap: "1.5rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  mutedCard: {
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "1rem",
  },
  modalityValue: {
    marginTop: "0.25rem",
  },
  rules: {
    display: "grid",
    gap: "2rem",
  },
  fieldset: {
    display: "grid",
    gap: "1.25rem",
    borderWidth: 0,
    padding: 0,
  },
  pairTight: {
    display: "grid",
    gap: "1.25rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  triple: {
    display: "grid",
    gap: "1.25rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
    },
  },
  reviewGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  reviewTerm: {
    color: colors.mutedForeground,
  },
  reviewValue: {
    marginTop: "0.25rem",
    fontWeight: 600,
  },
});
