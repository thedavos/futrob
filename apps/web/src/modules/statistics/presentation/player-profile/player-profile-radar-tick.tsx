import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { chartCoordSchema } from "./player-profile-chart-coord.ts";

const styles = stylex.create({
  axisTick: {
    fill: colors.foreground,
    fontSize: 11,
  },
  axisTickScore: {
    fill: colors.mutedForeground,
    fontSize: 10,
    fontVariantNumeric: "tabular-nums",
  },
});

export type RadarPoint = {
  readonly category: string;
  readonly score: number;
};

type RadarAxisTickVerticalAnchor = "start" | "middle" | "end";

function radarAxisTickStartDy(verticalAnchor: RadarAxisTickVerticalAnchor | undefined): number {
  switch (verticalAnchor) {
    case "end":
      return -14;
    case "start":
      return 12;
    case "middle":
      return -6;
    case undefined:
      return 0;
    default: {
      const _exhaustive: never = verticalAnchor;
      return _exhaustive;
    }
  }
}

export function RadarAxisTick({
  payload,
  points,
  textAnchor = "middle",
  verticalAnchor,
  x = 0,
  y = 0,
}: {
  readonly payload?: { readonly index?: number };
  readonly points: readonly RadarPoint[];
  readonly textAnchor?: "start" | "middle" | "end";
  readonly verticalAnchor?: RadarAxisTickVerticalAnchor;
  readonly x?: number | string;
  readonly y?: number | string;
}) {
  const point = payload?.index === undefined ? undefined : points[payload.index];
  if (point === undefined) return null;
  const parsedX = chartCoordSchema.safeParse(x);
  const parsedY = chartCoordSchema.safeParse(y);
  if (!parsedX.success || !parsedY.success) return null;
  const tickX = parsedX.data;
  const tickY = parsedY.data;
  const label = applyStyles(styles.axisTick);
  const score = applyStyles(styles.axisTickScore);
  return (
    <text
      className={label.className}
      data-slot="player-radar-axis-tick"
      style={label.style}
      textAnchor={textAnchor}
      x={tickX}
      y={tickY}
    >
      <tspan dy={radarAxisTickStartDy(verticalAnchor)} x={tickX}>
        {point.category}
      </tspan>
      <tspan className={score.className} dy={12} style={score.style} x={tickX}>
        {point.score}
      </tspan>
    </text>
  );
}
