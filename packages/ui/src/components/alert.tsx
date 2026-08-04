import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-lg p-4 text-sm [&>svg]:mt-0.5 [&>svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-surface text-foreground",
        info: "bg-info/8 text-foreground [&>svg]:text-info",
        success: "bg-success/8 text-foreground [&>svg]:text-success",
        warning: "bg-warning/8 text-foreground [&>svg]:text-warning",
        destructive: "bg-danger/8 text-foreground [&>svg]:text-danger",
      },
      elevation: {
        /** Structural border; default for inline alerts. */
        flat: "",
        /** Soft elevation — no border on the same element. */
        elevated: "smooth-shadow-ring-md",
      },
    },
    compoundVariants: [
      { elevation: "flat", variant: "default", class: "border border-border" },
      { elevation: "flat", variant: "info", class: "border border-info/25" },
      { elevation: "flat", variant: "success", class: "border border-success/25" },
      { elevation: "flat", variant: "warning", class: "border border-warning/30" },
      { elevation: "flat", variant: "destructive", class: "border border-danger/25" },
    ],
    defaultVariants: {
      variant: "default",
      elevation: "flat",
    },
  },
);

function Alert({
  className,
  elevation = "flat",
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-elevation={elevation ?? "flat"}
      role="alert"
      className={cn(alertVariants({ elevation, variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 font-semibold leading-snug", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("col-start-2 leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle, alertVariants };
