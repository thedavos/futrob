import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "#lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <span
      data-slot="control-shell"
      className="flex w-full rounded-[calc(var(--corner-lg)+0.125rem)] bg-muted/40 p-0.5 ring-1 ring-border-subtle/80 has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50 dark:bg-muted/20 dark:ring-border-subtle"
    >
      <InputPrimitive
        type={type}
        data-slot="input"
        className={cn(
          "h-10 w-full min-w-0 rounded-lg border border-input bg-surface px-2.5 py-1 text-base shadow-[var(--shadow-inset-control)] transition-[border-color,box-shadow] duration-(--duration-normal) ease-(--ease-emphasized) outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:shadow-[var(--shadow-inset-control-focus)] focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 max-sm:h-(--control-height-touch) md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
        {...props}
      />
    </span>
  );
}

export { Input };
