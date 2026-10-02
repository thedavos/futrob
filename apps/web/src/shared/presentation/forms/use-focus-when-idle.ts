"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

/**
 * Focuses a field once `busy` clears. Inputs are disabled while a request runs, so focusing
 * right after an async validation failure would do nothing; ask for focus and it lands when
 * the form is enabled again.
 */
export function useFocusWhenIdle<Field extends string>(
  busy: boolean,
  fields: Readonly<Record<Field, RefObject<HTMLElement | null>>>,
): (field: Field) => void {
  const pending = useRef<Field | null>(null);

  useEffect(() => {
    if (busy || pending.current === null) return;
    fields[pending.current].current?.focus();
    pending.current = null;
  }, [busy, fields]);

  return useCallback((field) => {
    pending.current = field;
  }, []);
}
