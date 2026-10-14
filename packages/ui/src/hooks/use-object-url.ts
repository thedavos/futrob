"use client";

import { useExternalSync } from "#hooks/use-external-sync";
import { useState } from "react";

/**
 * Object URL for a `File`, revoked when the file changes or the caller unmounts.
 * Browser blob URLs are an external resource, so this goes through `useExternalSync`.
 */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useExternalSync(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const created = URL.createObjectURL(file);
    setUrl(created);
    return () => {
      URL.revokeObjectURL(created);
    };
  }, [file]);

  return file === null ? null : url;
}
