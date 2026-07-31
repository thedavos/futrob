import { Form as FormPrimitive } from "@base-ui/react/form";

import { cn } from "#lib/utils";

type FormProps<FormValues extends Record<string, any> = Record<string, any>> =
  FormPrimitive.Props<FormValues>;

type FormErrors<Field extends string = string> = Partial<Record<Field, string | string[]>>;

function Form<FormValues extends Record<string, any> = Record<string, any>>({
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
