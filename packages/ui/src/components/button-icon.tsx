import * as React from "react";

import { cn } from "#lib/utils";

/**
 * Futrob's distinctive nested icon island for marketing CTAs.
 * Keep product controls and dense operator interfaces on plain inline icons.
 */
function ButtonIcon({
  "aria-hidden": ariaHidden = true,
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden={ariaHidden}
      data-slot="button-icon"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-current/10 transition-[opacity,translate,scale] duration-(--duration-normal) ease-(--ease-emphasized) group-hover/button:translate-x-0.5 group-hover/button:-translate-y-px group-hover/button:scale-105 group-active/button:translate-x-0 group-active/button:translate-y-0 group-active/button:scale-100 [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

export { ButtonIcon };
