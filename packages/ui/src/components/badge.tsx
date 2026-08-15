import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-muted-foreground",
        primary: "border-primary/20 bg-primary/10 text-primary",
        approved: "border-approved/25 bg-approved-subtle text-approved-subtle-foreground",
        info: "border-info/25 bg-info/10 text-info",
        warning: "border-warning/25 bg-warning/10 text-warning",
        destructive: "border-danger/25 bg-danger/10 text-danger",
        emphasis: "border-emphasis/25 bg-emphasis/10 text-emphasis",
        outline: "border-border-strong bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
