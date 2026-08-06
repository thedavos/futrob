import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, CaretDown } from "@phosphor-icons/react";

import { cn } from "#lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

type SelectTriggerProps = SelectPrimitive.Trigger.Props & {
  /** Compact desktop/operator mode. Touch layouts stay at the accessible 44px target. */
  dense?: boolean;
};

function SelectTrigger({ children, className, dense = false, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-density={dense ? "dense" : "default"}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-surface px-3 text-left text-base text-foreground transition-[background-color,border-color,box-shadow] duration-(--duration-normal) ease-(--ease-emphasized) outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 data-placeholder:text-muted-foreground aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/15 aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger/25 sm:text-sm [&_svg]:pointer-events-none [&_svg]:shrink-0",
        dense
          ? "h-(--control-height-dense) max-sm:h-(--control-height-touch)"
          : "h-(--control-height)",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <CaretDown
          aria-hidden="true"
          className="size-4 text-muted-foreground"
          data-slot="select-trigger-icon"
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  align = "start",
  alignItemWithTrigger = false,
  children,
  className,
  sideOffset = 6,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, "align" | "alignItemWithTrigger" | "sideOffset">) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        alignItemWithTrigger={alignItemWithTrigger}
        className="z-50 outline-none"
        sideOffset={sideOffset}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "min-w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground smooth-shadow-ring-md transition-[opacity,scale] duration-(--duration-normal) data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: SelectPrimitive.Label.Props) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("typo-label px-2 py-2 text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({ children, className, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-10 cursor-default items-center gap-2 rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex size-4 items-center justify-center">
        <Check aria-hidden="true" className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border-subtle", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
export type { SelectTriggerProps };
