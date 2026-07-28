import * as React from "react";

import { cn } from "#lib/utils";

function EmptyState({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex min-h-56 w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border-strong bg-surface p-8 text-center",
        className,
      )}
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

export { EmptyState, EmptyStateActions, EmptyStateDescription, EmptyStateIcon, EmptyStateTitle };
