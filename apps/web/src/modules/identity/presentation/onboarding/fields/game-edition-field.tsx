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
import { knownGameEditions } from "../onboarding-step-meta.ts";
import { FieldsetError } from "./fieldset-error.tsx";

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
}) {
  return (
    <fieldset className="m-0 border-0 p-0" data-edition-group data-competition-edition>
      <legend className="mb-3 typo-label" id={legendId}>
        Edición del juego
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
          <ChoiceGroupItem appearance="pill" key={edition} value={edition}>
            <ChoiceGroupIndicator className="static size-5" />
            {edition}
          </ChoiceGroupItem>
        ))}
        <ChoiceGroupItem appearance="pill" value="__other__">
          <ChoiceGroupIndicator className="static size-5" />
          Otra edición
        </ChoiceGroupItem>
      </ChoiceGroup>
      {custom ? (
        <Field className="mt-4 gap-3" invalid={invalid}>
          <FieldLabel htmlFor={customInputId}>Nombre de la edición</FieldLabel>
          <Input
            aria-describedby={invalid ? errorId : undefined}
            aria-invalid={invalid}
            id={customInputId}
            maxLength={40}
            onChange={(event) => onValueChange({ value: event.target.value, custom: true })}
            placeholder="ej. FC 24"
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
