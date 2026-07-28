import * as React from "react";

import { cn } from "#lib/utils";

/** Nested icon island for primary CTAs (trailing arrow, external link, etc.). */
function ButtonIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="button-icon"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-foreground/10 transition-[opacity,transform] duration-(--duration-normal) ease-(--ease-emphasized) group-hover/button:translate-x-0.5 group-hover/button:-translate-y-px group-hover/button:scale-105 group-active/button:translate-x-0 group-active/button:translate-y-0 group-active/button:scale-100 [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

export { ButtonIcon };
