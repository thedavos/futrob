import * as React from "react";

import { cn } from "#lib/utils";

type TextareaProps = React.ComponentProps<"textarea"> & {
  /** Compact desktop/operator mode. Touch layouts retain comfortable padding. */
  dense?: boolean;
};

function Textarea({ className, dense = false, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-density={dense ? "dense" : "default"}
      className={cn(
        "min-h-28 w-full resize-y rounded-lg border border-input bg-surface px-3 text-base leading-relaxed text-foreground transition-[background-color,border-color,box-shadow] duration-(--duration-normal) ease-(--ease-emphasized) outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/15 aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger/25 sm:text-sm",
        dense ? "py-2 max-sm:py-2.5" : "py-2.5",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
export type { TextareaProps };
