import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

const buttonVariants = cva(
  "group/button cursor-pointer relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,scale] duration-(--duration-normal) ease-(--ease-emphasized) outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/15 aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover",
        outline:
          "border-border-strong bg-surface text-foreground hover:bg-muted aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-hover aria-expanded:bg-secondary-hover",
        ghost: "bg-transparent text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive:
          "bg-danger text-danger-foreground hover:bg-destructive active:bg-destructive focus-visible:border-danger focus-visible:ring-danger/25",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "aspect-square px-0",
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
const disableFormStateRestore = { autoComplete: "off" } as const;

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Compact desktop/operator mode. Touch layouts stay at the accessible 44px target. */
    dense?: boolean;
    /** Turn off press feedback for controls that should remain visually anchored. */
    static?: boolean;
  };

function Button({
  className,
  dense = false,
  nativeButton,
  render,
  variant = "default",
  size = "default",
  static: isStatic = false,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-density={dense ? "dense" : "default"}
      nativeButton={nativeButton ?? render == null}
      render={render}
      className={cn(
        buttonVariants({ variant, size, static: isStatic }),
        dense
          ? size === "icon"
            ? "size-(--control-height-dense) max-sm:size-(--control-height-touch)"
            : "min-h-(--control-height-dense) max-sm:min-h-(--control-height-touch)"
          : size === "icon"
            ? "size-(--control-height)"
            : "min-h-(--control-height)",
        className,
      )}
      {...props}
      {...disableFormStateRestore}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
