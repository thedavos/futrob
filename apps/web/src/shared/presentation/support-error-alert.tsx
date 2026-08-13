"use client";

import { useState } from "react";
import type { RequestId } from "@futrob/api-contracts";
import { Alert, AlertDescription, AlertTitle, Button, cn, useCopyToClipboard } from "@futrob/ui";
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
    <Alert className={cn("gap-y-3", className)} variant="destructive">
      <span
        aria-hidden="true"
        className="flex h-6 w-4 shrink-0 items-center justify-center text-danger"
      >
        <WarningCircleIcon className="size-4" />
      </span>
      <AlertTitle className="text-base font-normal leading-6 text-pretty">
        {error.message}
      </AlertTitle>
      {error.retryAfterSeconds || error.requestId ? (
        <AlertDescription className="grid gap-4">
          {error.retryAfterSeconds ? (
            <span aria-live="polite" className="text-sm font-normal text-pretty">
              {copy.retryAfter(error.retryAfterSeconds)}
            </span>
          ) : null}
          {error.requestId ? (
            <span className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 text-sm font-normal">
                {copy.codeLabel}{" "}
                <code className="break-all text-sm font-medium text-foreground tabular-nums">
                  {error.requestId}
                </code>
              </span>
              <Button
                aria-label={copy.copyAria}
                dense
                onClick={() => void copySupportCode()}
                type="button"
                variant="outline"
              >
                <span aria-hidden="true" className="relative size-4 shrink-0">
                  <CopyIcon
                    className={cn(
                      "absolute inset-0 size-4 transition-[opacity,scale,filter] duration-(--duration-slow) ease-(--ease-standard)",
                      isCopied
                        ? "scale-[0.25] opacity-0 blur-xs"
                        : "scale-100 opacity-100 blur-none",
                    )}
                  />
                  <CheckIcon
                    className={cn(
                      "absolute inset-0 size-4 transition-[opacity,scale,filter] duration-(--duration-slow) ease-(--ease-standard)",
                      isCopied
                        ? "scale-100 opacity-100 blur-none"
                        : "scale-[0.25] opacity-0 blur-xs",
                    )}
                  />
                </span>
                <span className="grid justify-items-center">
                  <span
                    className={cn(
                      "col-start-1 row-start-1 transition-opacity duration-(--duration-slow) ease-(--ease-standard)",
                      isCopied && "opacity-0",
                    )}
                  >
                    {copy.copyAction}
                  </span>
                  <span
                    className={cn(
                      "col-start-1 row-start-1 transition-opacity duration-(--duration-slow) ease-(--ease-standard)",
                      isCopied ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {copy.copyDone}
                  </span>
                </span>
              </Button>
              <span aria-live="polite" className="sr-only">
                {isCopied ? copy.copySuccess : copyFailed ? copy.copyFailure : ""}
              </span>
            </span>
          ) : null}
        </AlertDescription>
      ) : null}
    </Alert>
  );
}
