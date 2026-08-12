import type { Ref } from "react";
import {
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@futrob/ui";
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
  return (
    <fieldset className="m-0 border-0 p-0" data-edition-group data-competition-edition>
      <legend className="mb-3 typo-label" id={legendId}>
        {copy.legend}
      </legend>
      <ChoiceGroup
        aria-describedby={invalid ? errorId : undefined}
        aria-invalid={invalid}
        aria-labelledby={legendId}
        className="grid-cols-1 sm:grid-cols-3"
        onValueChange={(next: string) => {
          const isCustom = next === "__other__";
          onValueChange({ value: isCustom ? "" : next, custom: isCustom });
        }}
        value={custom ? "__other__" : value}
      >
        {knownGameEditions.map((edition) => (
          <ChoiceGroupItem appearance="pill" disabled={disabled} key={edition} value={edition}>
            <ChoiceGroupIndicator className="static size-5" />
            {edition}
          </ChoiceGroupItem>
        ))}
        <ChoiceGroupItem appearance="pill" disabled={disabled} value="__other__">
          <ChoiceGroupIndicator className="static size-5" />
          {copy.other}
        </ChoiceGroupItem>
      </ChoiceGroup>
      {custom ? (
        <Field className="mt-4 gap-3" invalid={invalid}>
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
