"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  type ButtonProps,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { runAction } from "@/shared/presentation/run-action.ts";

export function ConfirmAction({
  triggerLabel,
  triggerIcon,
  confirmLabel,
  description,
  dense,
  disabled,
  onConfirm,
  variant = "outline",
  confirmVariant,
}: Readonly<{
  triggerLabel: string;
  triggerIcon?: ReactNode;
  confirmLabel: string;
  description: string;
  dense?: boolean;
  disabled?: boolean;
  onConfirm: () => Promise<void>;
  variant?: ButtonProps["variant"];
  confirmVariant?: ButtonProps["variant"];
}>) {
  const { t } = useI18n();
  const actionVariant = confirmVariant ?? variant;
  return (
    <AlertDialog>
      <AlertDialogTrigger disabled={disabled} render={<Button dense={dense} variant={variant} />}>
        {triggerIcon}
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmLabel}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="ghost" />}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant={actionVariant} />}
            onClick={() => runAction(onConfirm)}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
