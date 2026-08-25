import type { Ref } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  Field,
  FieldError,
  FieldLabel,
  Input,
  typography,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/public.stylex";
import { FieldsetError } from "@/shared/presentation/forms/fieldset-error.tsx";
import { knownGameEditions } from "@/shared/presentation/forms/known-game-editions.ts";

export interface GameEditionFieldCopy {
  readonly legend: string;
  readonly other: string;
  readonly customName: string;
  readonly customPlaceholder: string;
}

const defaultCopy: GameEditionFieldCopy = {
  legend: "Edición del juego",
  other: "Otra edición",
  customName: "Nombre de la edición",
  customPlaceholder: "ej. FC 24",
};

const styles = stylex.create({
  fieldset: {
    margin: 0,
    borderWidth: 0,
    padding: 0,
  },
  legend: {
    marginBottom: "0.75rem",
  },
  group: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
    },
  },
  indicator: {
    position: "static",
    width: "1.25rem",
    height: "1.25rem",
  },
  customField: {
    marginTop: "1rem",
    gap: "0.75rem",
  },
});

export function GameEditionField({
  legendId,
  customInputId,
  value,
  custom,
  onValueChange,
  invalid,
  errorId,
  errorMessage,
  customInputRef,
  disabled = false,
  copy = defaultCopy,
}: {
  readonly legendId: string;
  readonly customInputId: string;
  readonly value: string;
  readonly custom: boolean;
  readonly onValueChange: (next: { readonly value: string; readonly custom: boolean }) => void;
  readonly invalid: boolean;
  readonly errorId: string;
  readonly errorMessage: string | null;
  readonly customInputRef?: Ref<HTMLInputElement>;
  readonly disabled?: boolean;
  readonly copy?: GameEditionFieldCopy;
}) {
  const group = applyStyles(styles.group);
  const indicator = applyStyles(styles.indicator);
  const customField = applyStyles(styles.customField);
  return (
    <fieldset data-competition-edition data-edition-group {...applyStyles(styles.fieldset)}>
      <legend id={legendId} {...applyStyles(typography.label, styles.legend)}>
        {copy.legend}
      </legend>
      <ChoiceGroup
        aria-describedby={invalid ? errorId : undefined}
        aria-invalid={invalid}
        aria-labelledby={legendId}
        className={group.className}
        onValueChange={(next: string) => {
          const isCustom = next === "__other__";
          onValueChange({ value: isCustom ? "" : next, custom: isCustom });
        }}
        style={group.style}
        value={custom ? "__other__" : value}
      >
        {knownGameEditions.map((edition) => (
          <ChoiceGroupItem appearance="pill" disabled={disabled} key={edition} value={edition}>
            <ChoiceGroupIndicator className={indicator.className} style={indicator.style} />
            {edition}
          </ChoiceGroupItem>
        ))}
        <ChoiceGroupItem appearance="pill" disabled={disabled} value="__other__">
          <ChoiceGroupIndicator className={indicator.className} style={indicator.style} />
          {copy.other}
        </ChoiceGroupItem>
      </ChoiceGroup>
      {custom ? (
        <Field className={customField.className} invalid={invalid} style={customField.style}>
          <FieldLabel htmlFor={customInputId}>{copy.customName}</FieldLabel>
          <Input
            aria-describedby={invalid ? errorId : undefined}
            aria-invalid={invalid}
            disabled={disabled}
            id={customInputId}
            maxLength={40}
            onChange={(event) => onValueChange({ value: event.target.value, custom: true })}
            placeholder={copy.customPlaceholder}
            ref={customInputRef}
            value={value}
          />
          {invalid && errorMessage ? (
            <FieldError id={errorId} match>
              {errorMessage}
            </FieldError>
          ) : null}
        </Field>
      ) : invalid && errorMessage ? (
        <FieldsetError id={errorId}>{errorMessage}</FieldsetError>
      ) : null}
    </fieldset>
  );
}
