import { Field as FieldPrimitive } from "@base-ui/react/field";
import { CircleAlert } from "lucide-react";

import { cn } from "#lib/utils";

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
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

function FieldError({ children, className, ...props }: FieldPrimitive.Error.Props) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      className={cn("flex items-start gap-1.5 text-sm font-medium text-danger", className)}
      {...props}
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </FieldPrimitive.Error>
  );
}

export { Field, FieldDescription, FieldError, FieldLabel };
