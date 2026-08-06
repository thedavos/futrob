import { Radio } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "@phosphor-icons/react";

import { cn } from "#lib/utils";

const choiceGroupItemVariants = cva(
  "relative flex cursor-pointer items-center border border-input bg-surface text-foreground outline-none transition-[background-color,border-color,color,scale] duration-(--duration-normal) ease-(--ease-emphasized) hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 data-[checked]:border-primary data-[checked]:bg-accent data-[checked]:hover:bg-accent data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 active:scale-[0.96] [&>svg]:text-muted-foreground [&>svg]:transition-[color] [&>svg]:duration-(--duration-normal) data-[checked]:[&>svg]:text-primary",
  {
    variants: {
      appearance: {
        tile: "min-h-24 flex-row justify-start gap-4 rounded-xl py-3 pr-12 pl-4 text-left [&>[data-slot=choice-group-indicator]]:right-4 [&>[data-slot=choice-group-indicator]]:top-1/2 [&>[data-slot=choice-group-indicator]]:-translate-y-1/2 sm:min-h-28 sm:flex-col sm:justify-center sm:gap-3 sm:p-5 sm:text-center sm:[&>[data-slot=choice-group-indicator]]:right-3 sm:[&>[data-slot=choice-group-indicator]]:top-3 sm:[&>[data-slot=choice-group-indicator]]:translate-y-0",
        pill: "min-h-(--control-height) justify-center gap-2 rounded-full px-5 py-2",
      },
    },
    defaultVariants: { appearance: "tile" },
  },
);

function ChoiceGroup<Value>({ className, ...props }: RadioGroupPrimitive.Props<Value>) {
  return (
    <RadioGroupPrimitive
      data-slot="choice-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

type ChoiceGroupItemProps<Value = string> = Radio.Root.Props<Value> &
  VariantProps<typeof choiceGroupItemVariants>;

function ChoiceGroupItem<Value>({ appearance, className, ...props }: ChoiceGroupItemProps<Value>) {
  return (
    <Radio.Root
      data-slot="choice-group-item"
      className={cn(choiceGroupItemVariants({ appearance }), className)}
      {...props}
    />
  );
}

function ChoiceGroupIndicator({ className, ...props }: Radio.Indicator.Props) {
  return (
    <Radio.Indicator
      keepMounted
      data-slot="choice-group-indicator"
      className={cn(
        "absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[opacity,filter,scale] duration-(--duration-normal) ease-(--ease-emphasized) data-[unchecked]:scale-[0.25] data-[unchecked]:opacity-0 data-[unchecked]:blur-[4px] data-[checked]:scale-100 data-[checked]:opacity-100 data-[checked]:blur-0",
        className,
      )}
      {...props}
    >
      <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
    </Radio.Indicator>
  );
}

export { ChoiceGroup, ChoiceGroupIndicator, ChoiceGroupItem, choiceGroupItemVariants };
export type { ChoiceGroupItemProps };
