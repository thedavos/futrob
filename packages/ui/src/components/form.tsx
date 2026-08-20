import { Form as FormPrimitive } from "@base-ui/react/form";

import { cn } from "#lib/utils";
import type { FormFieldValue } from "#lib/read-form-string";

type FormValuesRecord = { readonly [key: string]: FormFieldValue };

type FormProps<FormValues extends object = FormValuesRecord> = FormPrimitive.Props<FormValues>;

type FormErrors<Field extends string = string> = Partial<Record<Field, string | string[]>>;

function Form<FormValues extends object = FormValuesRecord>({
  className,
  validationMode = "onSubmit",
  ...props
}: FormProps<FormValues>) {
  return (
    <FormPrimitive
      data-slot="form"
      className={cn(className)}
      validationMode={validationMode}
      {...props}
    />
  );
}

export { Form };
export type { FormErrors, FormProps };
