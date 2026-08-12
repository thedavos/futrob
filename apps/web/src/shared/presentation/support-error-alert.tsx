"use client";

import { useState } from "react";
import type { RequestId } from "@futrob/api-contracts";
import { Alert, AlertDescription, Button, useCopyToClipboard } from "@futrob/ui";
import { CheckIcon, CopyIcon, WarningCircleIcon } from "@phosphor-icons/react";

export interface SupportError {
  readonly message: string;
  readonly requestId?: RequestId;
  readonly retryAfterSeconds?: number;
}

export function SupportErrorAlert({
  error,
  className,
}: Readonly<{ error: SupportError; className?: string }>) {
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const [copyFailed, setCopyFailed] = useState(false);

  async function copySupportCode() {
    if (!error.requestId) return;
    setCopyFailed(!(await copyToClipboard(error.requestId)));
  }

  return (
    <Alert className={className} variant="destructive">
      <WarningCircleIcon aria-hidden="true" />
      <AlertDescription className="grid gap-3">
        <span>{error.message}</span>
        {error.retryAfterSeconds ? (
          <span aria-live="polite">Podrás reintentar en {error.retryAfterSeconds} s.</span>
        ) : null}
        {error.requestId ? (
          <span className="flex flex-wrap items-center gap-3">
            <span className="typo-caption">
              Código de soporte: <code>{error.requestId}</code>
            </span>
            <Button
              aria-label="Copiar código de soporte"
              onClick={() => void copySupportCode()}
              type="button"
              variant="outline"
            >
              {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
              {isCopied ? "Copiado" : "Copiar código"}
            </Button>
            <span aria-live="polite" className="sr-only">
              {isCopied ? "Código copiado" : copyFailed ? "No se pudo copiar el código" : ""}
            </span>
          </span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
