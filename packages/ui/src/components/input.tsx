import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "#lib/utils";

type InputProps = InputPrimitive.Props & {
  /** Compact desktop/operator mode. Touch layouts stay at the accessible 44px target. */
  dense?: boolean;
};

function Input({ className, dense = false, type, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-density={dense ? "dense" : "default"}
      className={cn(
        "w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-base text-foreground transition-[background-color,border-color,box-shadow] duration-(--duration-normal) ease-(--ease-emphasized) outline-none file:mr-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/15 aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger/25 sm:text-sm",
        dense
          ? "h-(--control-height-dense) max-sm:h-(--control-height-touch)"
          : "h-(--control-height)",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
export type { InputProps };
