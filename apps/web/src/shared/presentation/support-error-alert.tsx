"use client";

import { useState } from "react";
import type { RequestId } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyProps,
  applyStyles,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  useCopyToClipboard,
  vis,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
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

const styles = stylex.create({
  alert: {
    rowGap: "0.75rem",
  },
  iconWrap: {
    display: "flex",
    height: "1.5rem",
    width: "1rem",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    color: colors.danger,
  },
  icon: {
    width: "1rem",
    height: "1rem",
  },
  title: {
    fontSize: "1rem",
    fontWeight: 400,
    lineHeight: "1.5rem",
    textWrap: "pretty",
  },
  description: {
    display: "grid",
    gap: "1rem",
  },
  retry: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 400,
    textWrap: "pretty",
  },
  codeRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
  },
  codeLabel: {
    minWidth: 0,
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 400,
  },
  code: {
    wordBreak: "break-all",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 500,
    color: colors.foreground,
    fontVariantNumeric: "tabular-nums",
  },
  iconSwap: {
    position: "relative",
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
  },
  swapIcon: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "1rem",
    height: "1rem",
    transitionProperty: "opacity, scale, filter",
    transitionDuration: "var(--duration-slow)",
    transitionTimingFunction: "var(--ease-standard)",
  },
  swapHidden: {
    scale: "0.25",
    opacity: 0,
    filter: "blur(4px)",
  },
  swapVisible: {
    scale: 1,
    opacity: 1,
    filter: "blur(0)",
  },
  labelSwap: {
    display: "grid",
    justifyItems: "center",
  },
  labelLayer: {
    gridColumnStart: 1,
    gridRowStart: 1,
    transitionProperty: "opacity",
    transitionDuration: "var(--duration-slow)",
    transitionTimingFunction: "var(--ease-standard)",
  },
  labelHidden: {
    opacity: 0,
  },
  labelVisible: {
    opacity: 1,
  },
});

export function SupportErrorAlert({
  error,
  className,
  copy = defaultCopy,
}: Readonly<{ error: SupportError; className?: string; copy?: SupportErrorAlertCopy }>) {
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const [copyFailed, setCopyFailed] = useState(false);
  const alert = applyProps(className, undefined, styles.alert);
  const icon = applyStyles(styles.icon);
  const title = applyStyles(styles.title);
  const description = applyStyles(styles.description);
  const copyIcon = applyStyles(styles.swapIcon, isCopied ? styles.swapHidden : styles.swapVisible);
  const checkIcon = applyStyles(styles.swapIcon, isCopied ? styles.swapVisible : styles.swapHidden);

  async function copySupportCode() {
    if (!error.requestId) return;
    setCopyFailed(!(await copyToClipboard(error.requestId)));
  }

  return (
    <Alert className={alert.className} style={alert.style} variant="destructive">
      <span aria-hidden="true" {...applyStyles(styles.iconWrap)}>
        <WarningCircleIcon className={icon.className} style={icon.style} />
      </span>
      <AlertTitle className={title.className} style={title.style}>
        {error.message}
      </AlertTitle>
      {error.retryAfterSeconds || error.requestId ? (
        <AlertDescription className={description.className} style={description.style}>
          {error.retryAfterSeconds ? (
            <span aria-live="polite" {...applyStyles(styles.retry)}>
              {copy.retryAfter(error.retryAfterSeconds)}
            </span>
          ) : null}
          {error.requestId ? (
            <span {...applyStyles(styles.codeRow)}>
              <span {...applyStyles(styles.codeLabel)}>
                {copy.codeLabel} <code {...applyStyles(styles.code)}>{error.requestId}</code>
              </span>
              <Button
                aria-label={copy.copyAria}
                dense
                onClick={() => void copySupportCode()}
                type="button"
                variant="outline"
              >
                <span aria-hidden="true" {...applyStyles(styles.iconSwap)}>
                  <CopyIcon className={copyIcon.className} style={copyIcon.style} />
                  <CheckIcon className={checkIcon.className} style={checkIcon.style} />
                </span>
                <span {...applyStyles(styles.labelSwap)}>
                  <span {...applyStyles(styles.labelLayer, isCopied && styles.labelHidden)}>
                    {copy.copyAction}
                  </span>
                  <span
                    {...applyStyles(
                      styles.labelLayer,
                      isCopied ? styles.labelVisible : styles.labelHidden,
                    )}
                  >
                    {copy.copyDone}
                  </span>
                </span>
              </Button>
              <span aria-live="polite" {...applyStyles(vis.srOnly)}>
                {isCopied ? copy.copySuccess : copyFailed ? copy.copyFailure : ""}
              </span>
            </span>
          ) : null}
        </AlertDescription>
      ) : null}
    </Alert>
  );
}
