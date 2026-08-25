"use client";

import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Checkbox,
  colors,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  typography,
} from "@futrob/ui";
import { WarningCircleIcon } from "@phosphor-icons/react";

const styles = stylex.create({
  toggle: {
    display: "flex",
    minHeight: "2.75rem",
    alignItems: "center",
    gap: "0.75rem",
  },
  heading: {
    display: "grid",
    gap: "0.5rem",
  },
  title: {
    fontSize: "1.25rem",
    lineHeight: "1.75rem",
    fontWeight: 600,
  },
  copy: {
    color: colors.mutedForeground,
  },
  alert: {
    marginBottom: "1.25rem",
  },
});

const alert = applyStyles(styles.alert);

export function SelectField({
  id,
  label,
  value,
  items,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  items: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        onValueChange={(next) => {
          if (next) onChange(next);
        }}
        value={value}
      >
        <SelectTrigger disabled={disabled} id={id}>
          <SelectValue placeholder="Selecciona" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  disabled: boolean;
}) {
  const id = `rule-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        disabled={disabled}
        id={id}
        min={min}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        type="number"
        value={value ?? ""}
      />
    </Field>
  );
}
export function RuleToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  const id = `rule-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div {...applyStyles(styles.toggle)}>
      <Checkbox checked={checked} disabled={disabled} id={id} onCheckedChange={onChange} />
      <label {...applyStyles(typography.label)} htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
export function StepHeading({ title, copy }: { title: string; copy: string }) {
  return (
    <header {...applyStyles(styles.heading)}>
      <h2 {...applyStyles(styles.title)}>{title}</h2>
      <p {...applyStyles(typography.caption, styles.copy)}>{copy}</p>
    </header>
  );
}
export function PageAlert({ children }: { children: ReactNode }) {
  return (
    <Alert className={alert.className} style={alert.style} variant="destructive">
      <WarningCircleIcon aria-hidden="true" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
