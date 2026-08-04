import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

const cardVariants = cva("rounded-xl bg-surface text-foreground", {
  variants: {
    variant: {
      /** Flat/line default: structural border, no ambient elevation. */
      flat: "border border-border",
      /**
       * Soft elevation via shadow-plugin. Uses a baked-in hairline ring —
       * never pair with `border-*` / `ring-*` on the same element.
       */
      elevated: "smooth-shadow-ring-sm",
    },
  },
  defaultVariants: {
    variant: "flat",
  },
});

type CardProps = React.ComponentProps<"section"> & VariantProps<typeof cardVariants>;

function Card({ className, variant = "flat", ...props }: CardProps) {
  return (
    <section
      data-slot="card"
      data-variant={variant ?? "flat"}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header data-slot="card-header" className={cn("space-y-1.5 p-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3 data-slot="card-title" className={cn("text-lg font-semibold", className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("typo-caption text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6 pb-6", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="card-footer"
      className={cn("flex items-center gap-3 border-t border-border-subtle px-6 py-4", className)}
      {...props}
    />
  );
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };
