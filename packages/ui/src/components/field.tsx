import { Field as FieldPrimitive } from "@base-ui/react/field";
import { WarningCircleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { typography } from "#styles/typography";
import { formFieldValueSchema, type FormFieldValue } from "#lib/read-form-string";

type FieldActions = FieldPrimitive.Root.Actions;

type FieldFormValues = Parameters<NonNullable<FieldPrimitive.Root.Props["validate"]>>[1];

type FieldValidate = (
  value: FormFieldValue,
  formValues: FieldFormValues,
) => ReturnType<NonNullable<FieldPrimitive.Root.Props["validate"]>>;

type FieldProps = Omit<FieldPrimitive.Root.Props, "validate"> & {
  validate?: FieldValidate;
};

const styles = stylex.create({
  root: {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    display: "flex",
    cursor: "pointer",
    alignItems: "center",
    gap: "0.5rem",
    color: colors.foreground,
    userSelect: "none",
  },
  description: {
    fontSize: "0.75rem",
    lineHeight: 1.55,
    color: colors.mutedForeground,
  },
  error: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.375rem",
    fontSize: "0.75rem",
    lineHeight: 1.55,
    color: colors.danger,
  },
  errorIcon: {
    marginTop: "0.125rem",
    width: "0.75rem",
    height: "0.75rem",
    flexShrink: 0,
  },
});

function Field({ className, style, validate, ...props }: FieldProps) {
  const wrappedValidate: FieldPrimitive.Root.Props["validate"] = validate
    ? (value, formValues) => validate(formFieldValueSchema.parse(value), formValues)
    : undefined;

  return (
    <FieldPrimitive.Root
      data-slot="field"
      {...applyHost(className, style, styles.root)}
      validate={wrappedValidate}
      {...props}
    />
  );
}

function FieldLabel({ className, style, ...props }: FieldPrimitive.Label.Props) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      {...applyHost(className, style, typography.label, styles.label)}
      {...props}
    />
  );
}

function FieldDescription({ className, style, ...props }: FieldPrimitive.Description.Props) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      {...applyHost(className, style, styles.description)}
      {...props}
    />
  );
}

function FieldError({ className, style, ...props }: Omit<FieldPrimitive.Error.Props, "render">) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      {...applyHost(className, style, styles.error)}
      render={(elementProps) => (
        <div {...elementProps}>
          <WarningCircleIcon
            aria-hidden="true"
            {...applyHost(undefined, undefined, styles.errorIcon)}
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
