"use client";

import {
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@futrob/ui";

export type SanctionSelectItem = { readonly value: string; readonly label: string };

/** A labelled single-choice field of the impose form, with its own error line. */
export function SanctionSelectField({
  disabled,
  error,
  id,
  items,
  label,
  onChange,
  placeholder,
  value,
}: {
  readonly disabled: boolean;
  /** Shown, and the trigger marked invalid, when the field fails validation. */
  readonly error?: string | null;
  readonly id: string;
  readonly items: readonly SanctionSelectItem[];
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly value: string;
}) {
  const invalid = Boolean(error);
  return (
    <Field disabled={disabled} invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        disabled={disabled}
        items={items}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
        value={value || null}
      >
        <SelectTrigger aria-invalid={invalid} id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <FieldError match>{error}</FieldError> : null}
    </Field>
  );
}
