import * as React from "react";

import { cn } from "#lib/utils";

function PageHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "mb-8 grid grid-cols-1 items-start gap-x-4 gap-y-2",
        "has-[[data-slot=page-header-actions]]:grid-cols-[minmax(0,1fr)_auto]",
        className,
      )}
      {...props}
    />
  );
}

function PageHeaderEyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-header-eyebrow"
      className={cn("typo-label col-start-1 text-muted-foreground", className)}
      {...props}
    />
  );
}

function PageHeaderTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-header-title"
      className={cn("typo-heading col-start-1 text-balance", className)}
      {...props}
    />
  );
}

function PageHeaderDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-header-description"
      className={cn(
        "typo-subtitle col-start-1 max-w-2xl text-pretty text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function PageHeaderActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-header-actions"
      className={cn(
        "col-start-2 row-start-1 row-span-3 flex flex-wrap items-center justify-end gap-2 self-start",
        className,
      )}
      {...props}
    />
  );
}

export { PageHeader, PageHeaderActions, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle };
