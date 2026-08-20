"use client";

import { useEffect, useRef, useState } from "react";
import { hasBrowserWindow } from "#lib/browser-runtime";

function legacyCopyToClipboard(value: string): boolean {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, value.length);

  let hasCopied = false;
  try {
    hasCopied = document.execCommand("copy");
  } catch {
    hasCopied = false;
  }

  document.body.removeChild(textArea);
  return hasCopied;
}

type UseCopyToClipboardOptions = {
  /** Auto-clear `isCopied` after this many ms. `0` keeps it until `reset`. */
  timeout?: number;
  onCopy?: () => void;
};

/**
 * Clipboard helper aligned with the shadcn docs hook: Clipboard API first,
 * `execCommand` fallback, and temporary `isCopied` feedback.
 */
export function useCopyToClipboard({ timeout = 2000, onCopy }: UseCopyToClipboardOptions = {}) {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  function reset() {
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setIsCopied(false);
  }

  async function copyToClipboard(value: string): Promise<boolean> {
    if (!hasBrowserWindow() || value.length === 0) {
      reset();
      return false;
    }

    let hasCopied = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        hasCopied = true;
      } catch {
        hasCopied = legacyCopyToClipboard(value);
      }
    } else {
      hasCopied = legacyCopyToClipboard(value);
    }

    if (!hasCopied) {
      reset();
      return false;
    }

    setIsCopied(true);
    onCopy?.();

    if (timeout !== 0) {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        setIsCopied(false);
        resetTimerRef.current = null;
      }, timeout);
    }

    return true;
  }

  return { isCopied, copyToClipboard, reset };
}
