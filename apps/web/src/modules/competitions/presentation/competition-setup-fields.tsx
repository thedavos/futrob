"use client";

import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  Checkbox,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@futrob/ui";
import { WarningCircleIcon } from "@phosphor-icons/react";

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
    <div className="flex min-h-11 items-center gap-3">
      <Checkbox checked={checked} disabled={disabled} id={id} onCheckedChange={onChange} />
      <label className="typo-label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
export function StepHeading({ title, copy }: { title: string; copy: string }) {
  return (
    <header className="grid gap-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="typo-caption text-muted-foreground">{copy}</p>
    </header>
  );
}
export function PageAlert({ children }: { children: ReactNode }) {
  return (
    <Alert className="mb-5" variant="destructive">
      <WarningCircleIcon aria-hidden="true" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
