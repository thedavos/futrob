import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-lg border p-4 text-sm [&>svg]:mt-0.5 [&>svg]:size-4",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-foreground",
        info: "border-info/25 bg-info/8 text-foreground [&>svg]:text-info",
        success: "border-success/25 bg-success/8 text-foreground [&>svg]:text-success",
        warning: "border-warning/30 bg-warning/8 text-foreground [&>svg]:text-warning",
        destructive: "border-danger/25 bg-danger/8 text-foreground [&>svg]:text-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
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
