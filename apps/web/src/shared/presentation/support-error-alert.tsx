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

export interface SupportErrorAlertCopy {
  readonly retryAfter: (seconds: number) => string;
  readonly codeLabel: string;
  readonly copyAria: string;
  readonly copyAction: string;
  readonly copyDone: string;
  readonly copySuccess: string;
  readonly copyFailure: string;
}

const defaultCopy: SupportErrorAlertCopy = {
  retryAfter: (seconds) => `Podrás reintentar en ${seconds} s.`,
  codeLabel: "Código de soporte:",
  copyAria: "Copiar código de soporte",
  copyAction: "Copiar código",
  copyDone: "Copiado",
  copySuccess: "Código copiado",
  copyFailure: "No se pudo copiar el código",
};

export function SupportErrorAlert({
  error,
  className,
  copy = defaultCopy,
}: Readonly<{ error: SupportError; className?: string; copy?: SupportErrorAlertCopy }>) {
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
          <span aria-live="polite">{copy.retryAfter(error.retryAfterSeconds)}</span>
        ) : null}
        {error.requestId ? (
          <span className="flex flex-wrap items-center gap-3">
            <span className="typo-caption">
              {copy.codeLabel} <code>{error.requestId}</code>
            </span>
            <Button
              aria-label={copy.copyAria}
              onClick={() => void copySupportCode()}
              type="button"
              variant="outline"
            >
              {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
              {isCopied ? copy.copyDone : copy.copyAction}
            </Button>
            <span aria-live="polite" className="sr-only">
              {isCopied ? copy.copySuccess : copyFailed ? copy.copyFailure : ""}
            </span>
          </span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
