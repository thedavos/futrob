import { Field as FieldPrimitive } from "@base-ui/react/field";
import { WarningCircleIcon } from "@phosphor-icons/react";

import { cn } from "#lib/utils";

type FieldActions = FieldPrimitive.Root.Actions;

function Field({ className, ...props }: FieldPrimitive.Root.Props) {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      className={cn("group/field flex w-full flex-col gap-2", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: FieldPrimitive.Label.Props) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn(
        "typo-label flex cursor-pointer items-center gap-2 text-foreground select-none group-data-[disabled]/field:pointer-events-none group-data-[disabled]/field:cursor-not-allowed group-data-[disabled]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: FieldPrimitive.Description.Props) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn("text-xs leading-normal text-muted-foreground", className)}
      {...props}
    />
  );
}

function FieldError({ className, ...props }: Omit<FieldPrimitive.Error.Props, "render">) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      className={cn("flex items-start gap-1.5 text-xs leading-normal text-danger", className)}
      render={(elementProps) => (
        <div {...elementProps}>
          <WarningCircleIcon
            aria-hidden="true"
            className="mt-0.5 size-3 shrink-0"
            strokeWidth={1.5}
          />
          <span>{elementProps.children}</span>
        </div>
      )}
      {...props}
    />
  );
}

const FieldValidity = FieldPrimitive.Validity;

export { Field, FieldDescription, FieldError, FieldLabel, FieldValidity };
export type { FieldActions };
