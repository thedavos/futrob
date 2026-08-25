import { Form as FormPrimitive } from "@base-ui/react/form";

import { applyProps } from "#styles/apply";
import type { FormFieldValue } from "#lib/read-form-string";

type FormValuesRecord = { readonly [key: string]: FormFieldValue };

type FormProps<FormValues extends object = FormValuesRecord> = FormPrimitive.Props<FormValues>;

type FormErrors<Field extends string = string> = Partial<Record<Field, string | string[]>>;

function Form<FormValues extends object = FormValuesRecord>({
  className,
  style,
  validationMode = "onSubmit",
  ...props
}: FormProps<FormValues>) {
  return (
    <FormPrimitive
      data-slot="form"
      {...applyProps(className, style)}
      validationMode={validationMode}
      {...props}
    />
  );
}

export { Form };
export type { FormErrors, FormProps };
