import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";

import { cn } from "#lib/utils";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer flex size-5 shrink-0 items-center justify-center rounded-sm border border-input bg-surface text-primary-foreground transition-[background-color,border-color,box-shadow] duration-(--duration-normal) outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/15 aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger/25",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="group/checkbox-indicator flex items-center justify-center"
      >
        <CheckIcon
          aria-hidden="true"
          className="size-3.5 group-data-[indeterminate]/checkbox-indicator:hidden"
          strokeWidth={2.5}
        />
        <MinusIcon
          aria-hidden="true"
          className="hidden size-3.5 group-data-[indeterminate]/checkbox-indicator:block"
          strokeWidth={2.5}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
