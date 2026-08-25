"use client";

import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, colors, Stat, StatLabel, Tooltip, TooltipContent, TooltipTrigger } from "@futrob/ui";

const styles = stylex.create({
  trigger: {
    minHeight: "2.75rem",
    minWidth: 0,
    width: "100%",
    borderRadius: "var(--corner-md)",
    textAlign: "left",
    outlineWidth: {
      default: 0,
      ":focus-visible": 2,
    },
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineOffset: {
      default: null,
      ":focus-visible": "2px",
    },
    outlineColor: {
      default: null,
      ":focus-visible": colors.ring,
    },
  },
  stat: {
    gap: "0.125rem",
  },
});

export function TooltipStat({
  children,
  label,
  tooltip,
}: {
  readonly children: ReactNode;
  readonly label: string;
  readonly tooltip: string;
}) {
  const trigger = applyStyles(styles.trigger);
  const stat = applyStyles(styles.stat);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={tooltip}
            className={trigger.className}
            style={trigger.style}
            type="button"
          />
        }
      >
        <Stat className={stat.className} style={stat.style}>
          {children}
          <StatLabel>{label}</StatLabel>
        </Stat>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
