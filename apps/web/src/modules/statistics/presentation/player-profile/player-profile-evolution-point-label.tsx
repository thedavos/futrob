import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { z } from "zod";

export const evolutionPointLabelLayoutSchema = z.object({
  value: z.number(),
  x: z.number(),
  y: z.number(),
});

const styles = stylex.create({
  pointValue: {
    fill: colors.mutedForeground,
    fontVariantNumeric: "tabular-nums",
    pointerEvents: "none",
  },
});

export function formatEvolutionPointLabel(value: number, numberFormat: Intl.NumberFormat): string {
  return numberFormat.format(value);
}

export function EvolutionPointLabel({
  numberFormat,
  value,
  x,
  y,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly value: number;
  readonly x: number;
  readonly y: number;
}) {
  return (
    <text
      aria-hidden
      data-slot="evolution-point-value"
      dy={-10}
      fill="var(--muted-foreground)"
      fontSize={11}
      textAnchor="middle"
      x={x}
      y={y}
      {...applyStyles(typography.caption, styles.pointValue)}
    >
      {formatEvolutionPointLabel(value, numberFormat)}
    </text>
  );
}
