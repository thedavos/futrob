import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

const emptyStateVariants = cva(
  "flex min-h-56 w-full flex-col items-center justify-center gap-4 rounded-lg bg-surface p-8 text-center",
  {
    variants: {
      variant: {
        /** Dashed structural border; default empty panels. */
        flat: "border border-dashed border-border-strong",
        /** Soft elevation for an isolated empty panel on a flat background. */
        elevated: "smooth-shadow-ring-md",
      },
    },
    defaultVariants: {
      variant: "flat",
    },
  },
);

type EmptyStateProps = React.ComponentProps<"div"> & VariantProps<typeof emptyStateVariants>;

function EmptyState({ className, variant = "flat", ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      data-variant={variant ?? "flat"}
      className={cn(emptyStateVariants({ variant }), className)}
      {...props}
    />
  );
}

function EmptyStateIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="empty-state-icon"
      className={cn(
        "flex size-11 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground [&_svg]:size-5",
        className,
      )}
      {...props}
    />
  );
}

function EmptyStateTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="empty-state-title"
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function EmptyStateDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn("max-w-md text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

function EmptyStateActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-actions"
      className={cn("flex flex-wrap items-center justify-center gap-2", className)}
      {...props}
    />
  );
}

export {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  emptyStateVariants,
};
