"use client";

import type { Ref } from "react";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { resolutionInstant } from "./schedule-resolution-time.ts";

/** A competition wall time; the preview shows the instant the server will store. */
export function ScheduleChangeDateField({
  id,
  value,
  onChange,
  timeZone,
  format,
  error,
  disabled,
  inputRef,
}: {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly timeZone: string;
  readonly format: Intl.DateTimeFormat;
  readonly error: string | null;
  readonly disabled: boolean;
  readonly inputRef: Ref<HTMLInputElement>;
}) {
  const { t } = useI18n();
  const instant = resolutionInstant(value, timeZone);
  return (
    <Field disabled={disabled} invalid={error !== null}>
      <FieldLabel htmlFor={id}>{t("reschedule.newStart")}</FieldLabel>
      <Input
        ref={inputRef}
        id={id}
        type="datetime-local"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${id}-zone ${id}-preview`}
        aria-invalid={error !== null}
      />
      <FieldDescription id={`${id}-zone`}>
        {t("reschedule.zone", { zone: timeZone })}
      </FieldDescription>
      <FieldDescription id={`${id}-preview`}>
        {instant ? (
          <>
            {t("reschedule.preview")}{" "}
            <time dateTime={instant}>{format.format(new Date(instant))}</time>
          </>
        ) : null}
      </FieldDescription>
      {error ? <FieldError match>{error}</FieldError> : null}
    </Field>
  );
}
