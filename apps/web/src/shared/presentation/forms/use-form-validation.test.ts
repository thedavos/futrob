// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import type { FocusEvent } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { useFormValidation } from "./use-form-validation.ts";

type TestField = "email" | "password";

function createBlurEvent(
  currentTarget: HTMLDivElement,
  relatedTarget: EventTarget | null,
): FocusEvent<HTMLDivElement> {
  return { currentTarget, relatedTarget } as FocusEvent<HTMLDivElement>;
}

describe("useFormValidation", () => {
  it("keeps Base UI in submit mode until the field loses focus", () => {
    const { result } = renderHook(() => useFormValidation<TestField>());

    expect(result.current.getFieldValidationProps("email").validationMode).toBe("onSubmit");
    expect(result.current.touchedFields).toEqual({});
  });

  it("validates on group blur and switches that field to live validation", () => {
    const validate = vi.fn<() => void>();
    const fieldRoot = document.createElement("div");
    const { result } = renderHook(() => useFormValidation<TestField>());
    const initialProps = result.current.getFieldValidationProps("email");
    initialProps.actionsRef.current = { validate };

    act(() => {
      initialProps.onBlur(createBlurEvent(fieldRoot, null));
    });

    expect(validate).toHaveBeenCalledOnce();
    expect(result.current.touchedFields.email).toBe(true);
    expect(result.current.getFieldValidationProps("email").validationMode).toBe("onChange");
  });

  it("does not validate when focus moves inside a composite field", () => {
    const validate = vi.fn<() => void>();
    const fieldRoot = document.createElement("div");
    const innerButton = document.createElement("button");
    fieldRoot.append(innerButton);

    const { result } = renderHook(() => useFormValidation<TestField>());
    const fieldProps = result.current.getFieldValidationProps("password");
    fieldProps.actionsRef.current = { validate };

    act(() => {
      fieldProps.onBlur(createBlurEvent(fieldRoot, innerButton));
    });

    expect(validate).not.toHaveBeenCalled();
    expect(result.current.touchedFields.password).toBeUndefined();
  });

  it("provides external server errors to Base UI and clears them", () => {
    const { result } = renderHook(() => useFormValidation<TestField>());

    act(() => {
      result.current.applyServerErrors({
        email: "Ya existe una cuenta con este correo.",
      });
    });

    expect(result.current.formErrors).toEqual({
      email: "Ya existe una cuenta con este correo.",
    });

    act(() => {
      result.current.clearServerErrors();
    });

    expect(result.current.formErrors).toEqual({});
  });

  it("reuses the same Base UI actions ref for each field", () => {
    const { result } = renderHook(() => useFormValidation<TestField>());

    const firstRef = result.current.getFieldValidationProps("email").actionsRef;
    const secondRef = result.current.getFieldValidationProps("email").actionsRef;
    const passwordRef = result.current.getFieldValidationProps("password").actionsRef;

    expect(secondRef).toBe(firstRef);
    expect(passwordRef).not.toBe(firstRef);
  });
});
