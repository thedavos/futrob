import * as React from "react";

import { cn } from "#lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // Consumers must pass `htmlFor` or wrap an associated control.
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- primitive forwards label semantics via props
    <label
      data-slot="label"
      className={cn(
        "typo-label flex cursor-pointer items-center gap-2 text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
