import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
const styles = stylex.create({
  pending: {
    display: "flex",
    minHeight: "100svh",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingInline: "1.25rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  errorMain: {
    display: "flex",
    minHeight: "100svh",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingInline: "1.25rem",
  },
  errorBody: {
    display: "flex",
    maxWidth: "24rem",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    textAlign: "center",
  },
  errorMessage: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
});

export function RoutePendingState({ message = "Cargando…" }: Readonly<{ message?: string }>) {
  return (
    <main aria-live="polite" {...applyStyles(styles.pending)}>
      {message}
    </main>
  );
}

export function RouteLoadError({
  reset,
  message = "No pudimos cargar esta pantalla.",
}: ErrorComponentProps & Readonly<{ message?: string }>) {
  const router = useRouter();

  function retry() {
    reset();
    void router.invalidate();
  }

  return (
    <main {...applyStyles(styles.errorMain)}>
      <div role="alert" {...applyStyles(styles.errorBody)}>
        <p {...applyStyles(styles.errorMessage)}>{message}</p>
        <Button type="button" variant="outline" onClick={retry}>
          Reintentar
        </Button>
      </div>
    </main>
  );
}
