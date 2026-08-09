import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

const statVariants = cva("flex min-w-0 flex-col gap-1", {
  variants: {
    align: {
      start: "items-start text-left",
      center: "items-center text-center",
      end: "items-end text-right",
    },
  },
  defaultVariants: {
    align: "start",
  },
});

const statValueVariants = cva("min-w-0 max-w-full truncate text-foreground", {
  variants: {
    size: {
      /** Marcador / KPI destacado (`typo-score`). */
      default: "typo-score",
      /** Strip denso de KPIs en dashboards y resúmenes. */
      compact: "text-2xl font-semibold leading-none tracking-tight tabular-nums",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
    },
  },
  defaultVariants: {
    size: "default",
    tone: "default",
  },
});

type StatProps = React.ComponentProps<"div"> & VariantProps<typeof statVariants>;

function Stat({ className, align = "start", ...props }: StatProps) {
  return (
    <div
      data-slot="stat"
      data-align={align ?? "start"}
      className={cn(statVariants({ align }), className)}
      {...props}
    />
  );
}

function StatLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-label"
      className={cn("typo-label text-muted-foreground", className)}
      {...props}
    />
  );
}

type StatValueProps = React.ComponentProps<"div"> & VariantProps<typeof statValueVariants>;

function StatValue({ className, size = "default", tone = "default", ...props }: StatValueProps) {
  return (
    <div
      data-slot="stat-value"
      data-size={size ?? "default"}
      data-tone={tone ?? "default"}
      className={cn(statValueVariants({ size, tone }), className)}
      {...props}
    />
  );
}

function StatHint({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="stat-hint"
      className={cn("typo-caption text-muted-foreground", className)}
      {...props}
    />
  );
}

function StatGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-group"
      role="group"
      className={cn(
        "flex flex-wrap items-start gap-x-8 gap-y-5 [&>[data-slot=stat]]:min-w-[4.5rem]",
        className,
      )}
      {...props}
    />
  );
}

export { Stat, StatGroup, StatHint, StatLabel, StatValue, statValueVariants, statVariants };
export type { StatProps, StatValueProps };
