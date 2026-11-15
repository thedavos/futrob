import * as stylex from "@stylexjs/stylex";
import { Alert, AlertDescription, applyStyles, Button } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

const styles = stylex.create({
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
});

/** A failed read with its Retry action; pages pick the copy and whether it is a warning. */
export function RetryAlert({
  message,
  retry,
  t,
  variant = "destructive",
}: {
  readonly message: string;
  readonly retry: () => void;
  readonly t: Translator;
  readonly variant?: "destructive" | "warning";
}) {
  return (
    <Alert variant={variant}>
      <AlertDescription {...applyStyles(styles.row)}>
        <span>{message}</span>
        <Button onClick={retry} variant="secondary">
          {t("common.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
