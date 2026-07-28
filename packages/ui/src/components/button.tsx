import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,box-shadow,color,transform] duration-(--duration-normal) ease-(--ease-emphasized) outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 has-data-[icon=inline-end]:[&>svg:last-child]:transition-[opacity,transform] has-data-[icon=inline-end]:[&>svg:last-child]:duration-(--duration-normal) has-data-[icon=inline-end]:[&>svg:last-child]:ease-(--ease-emphasized) has-data-[icon=inline-end]:group-hover/button:[&>svg:last-child]:translate-x-0.5 has-data-[icon=inline-end]:group-hover/button:[&>svg:last-child]:-translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[var(--highlight-control)] hover:bg-primary-hover active:bg-primary-hover active:shadow-[var(--highlight-control-pressed)]",
        outline:
          "border-transparent bg-transparent text-foreground shadow-[var(--shadow-border),var(--shadow-inset-control)] hover:bg-muted hover:text-foreground hover:shadow-[var(--shadow-border-hover),var(--shadow-inset-control)] aria-expanded:bg-muted aria-expanded:text-foreground aria-expanded:shadow-[var(--shadow-border-hover),var(--shadow-inset-control)]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground shadow-[var(--highlight-control-subtle)] hover:bg-secondary-hover active:bg-secondary-hover active:shadow-[var(--highlight-control-pressed)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-(--control-height-md) gap-1.5 px-3.5 py-2 max-sm:min-h-(--control-height-touch) max-sm:px-4 max-sm:py-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 has-data-[icon=inline-end]:pl-3.5 has-data-[icon=inline-start]:pr-3.5",
        xs: "min-h-(--control-height-xs) gap-1 rounded-[min(var(--corner-md),10px)] px-2.5 py-1 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 has-data-[icon=inline-end]:pl-2.5 has-data-[icon=inline-start]:pr-2.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-(--control-height-sm) gap-1 rounded-[min(var(--corner-md),12px)] px-3 py-1.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 has-data-[icon=inline-end]:pl-3 has-data-[icon=inline-start]:pr-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-(--control-height-lg) gap-1.5 px-5 py-2.5 max-sm:min-h-(--control-height-touch) max-sm:px-5 max-sm:py-3 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 has-data-[icon=inline-end]:pl-5 has-data-[icon=inline-start]:pr-5",
        icon: "size-10 max-sm:size-(--control-height-touch)",
        "icon-xs":
          "size-10 rounded-[min(var(--corner-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-10 rounded-[min(var(--corner-md),12px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10 max-sm:size-(--control-height-touch)",
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

/** Stops browsers from restoring dynamic `disabled` across reloads (SSR hydration mismatch). */
const disableFormStateRestore = { autoComplete: "off" } as ButtonPrimitive.Props;

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Turn off press scale (toolbars, dense operator UI). */
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
      className={cn(buttonVariants({ variant, size, static: isStatic }), className)}
      {...props}
      {...disableFormStateRestore}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
