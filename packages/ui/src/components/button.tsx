import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,transform,box-shadow] duration-(--duration-fast) ease-(--ease-standard) outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover",
        outline:
          "border-border-strong bg-transparent text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-hover aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-(--control-height-md) gap-1.5 px-3.5 py-2 max-sm:min-h-(--control-height-touch) max-sm:px-4 max-sm:py-2.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "min-h-(--control-height-xs) gap-1 rounded-[min(var(--corner-md),10px)] px-2.5 py-1 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-(--control-height-sm) gap-1 rounded-[min(var(--corner-md),12px)] px-3 py-1.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-(--control-height-lg) gap-1.5 px-5 py-2.5 max-sm:min-h-(--control-height-touch) max-sm:px-5 max-sm:py-3 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-(--control-height-md) max-sm:size-(--control-height-touch)",
        "icon-xs":
          "size-(--control-height-xs) rounded-[min(var(--corner-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-(--control-height-sm) rounded-[min(var(--corner-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-(--control-height-lg) max-sm:size-(--control-height-touch)",
      },
      static: {
        true: "",
        false: "active:scale-[0.96]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      static: false,
    },
  },
);

/** Prevents browsers from restoring dynamic `disabled` across reloads (SSR hydration mismatch). */
const disableFormStateRestore = { autoComplete: "off" } as ButtonPrimitive.Props;

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Disables the press scale feedback (toolbars, dense operator UI). */
    static?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  static: isStatic = false,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, static: isStatic, className }))}
      {...props}
      {...disableFormStateRestore}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
