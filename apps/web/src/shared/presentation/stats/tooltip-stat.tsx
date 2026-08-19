"use client";

import type { ReactNode } from "react";
import { Stat, StatLabel, Tooltip, TooltipContent, TooltipTrigger } from "@futrob/ui";

export function TooltipStat({
  children,
  label,
  tooltip,
}: {
  readonly children: ReactNode;
  readonly label: string;
  readonly tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={tooltip}
            className="min-h-11 min-w-0 w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="button"
          />
        }
      >
        <Stat className="gap-0.5">
          {children}
          <StatLabel>{label}</StatLabel>
        </Stat>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
