"use client";

import { createRef, useCallback, useRef, useState, type FocusEvent, type RefObject } from "react";
import type { FieldActions, FormErrors } from "@futrob/ui";

export type TouchedFields<Field extends string> = Partial<Record<Field, true>>;

export interface FieldValidationProps {
  actionsRef: RefObject<FieldActions | null>;
  onBlur: (event: FocusEvent<HTMLDivElement>) => void;
  validationMode: "onChange" | "onSubmit";
}

/**
 * Adds Futrob's hybrid validation behavior on top of Base UI:
 * validate once focus leaves a field group, then revalidate that field on change.
 *
 * Base UI Form remains responsible for running validators, rendering errors,
 * blocking invalid submissions, and focusing the first invalid control.
 */
export function useFormValidation<Field extends string>() {
  const [touchedFields, setTouchedFields] = useState<TouchedFields<Field>>({});
  const [formErrors, setFormErrors] = useState<FormErrors<Field>>({});
  const fieldActionRefs = useRef(new Map<Field, RefObject<FieldActions | null>>());

  const getFieldActionsRef = useCallback((field: Field) => {
    const currentRef = fieldActionRefs.current.get(field);
    if (currentRef !== undefined) {
      return currentRef;
    }

    const nextRef = createRef<FieldActions>();
    fieldActionRefs.current.set(field, nextRef);
    return nextRef;
  }, []);

  const getFieldValidationProps = useCallback(
    (field: Field): FieldValidationProps => {
      const actionsRef = getFieldActionsRef(field);

      return {
        actionsRef,
        validationMode: touchedFields[field] === true ? "onChange" : "onSubmit",
        onBlur: (event) => {
          const nextFocusedElement = event.relatedTarget;
          if (
            nextFocusedElement instanceof Node &&
            event.currentTarget.contains(nextFocusedElement)
          ) {
            return;
          }

          setTouchedFields((currentFields) => ({
            ...currentFields,
            [field]: true,
          }));
          // Defer past the touched-state commit: Base UI ignores imperative
          // validate() while the field is still in validationMode="onSubmit",
          // and flipping to "onChange" only lands on the next render.
          setTimeout(() => {
            actionsRef.current?.validate();
          }, 0);
        },
      };
    },
    [getFieldActionsRef, touchedFields],
  );

  const applyServerErrors = useCallback((errors: FormErrors<Field>) => {
    setFormErrors({ ...errors });
  }, []);

  const clearServerErrors = useCallback(() => {
    setFormErrors({});
  }, []);

  return {
    applyServerErrors,
    clearServerErrors,
    formErrors,
    getFieldValidationProps,
    touchedFields,
  };
}
