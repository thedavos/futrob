"use client";

import type { Ref } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@futrob/ui";
import { timeZoneOptions } from "./time-zone-options.ts";

const styles = stylex.create({
  content: {
    maxHeight: "var(--available-height)",
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
});

const content = applyStyles(styles.content);

export function TimeZoneSelect({
  id,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
  placeholder,
  triggerRef,
}: Readonly<{
  id: string;
  value: string;
  onChange: (timeZone: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  placeholder: string;
  triggerRef?: Ref<HTMLButtonElement>;
}>) {
  return (
    <Select
      items={timeZoneOptions}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
      value={value}
    >
      <SelectTrigger
        aria-describedby={describedBy}
        aria-invalid={invalid}
        disabled={disabled}
        id={id}
        ref={triggerRef}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={content.className} style={content.style}>
        {timeZoneOptions.map((zone) => (
          <SelectItem key={zone.value} value={zone.value}>
            {zone.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
