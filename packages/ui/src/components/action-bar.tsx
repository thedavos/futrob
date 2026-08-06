import * as React from "react";

import { cn } from "#lib/utils";

function ActionBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action-bar"
      className={cn(
        "flex shrink-0 items-center justify-end gap-2 border-t border-border bg-surface px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

function ActionBarStart({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action-bar-start"
      className={cn("mr-auto flex min-w-0 items-center gap-2", className)}
      {...props}
    />
  );
}

function ActionBarEnd({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action-bar-end"
      className={cn("flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  );
}

export { ActionBar, ActionBarEnd, ActionBarStart };
