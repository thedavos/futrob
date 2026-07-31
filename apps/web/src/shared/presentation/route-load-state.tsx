import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@futrob/ui";

export function RoutePendingState({ message = "Cargando…" }: Readonly<{ message?: string }>) {
  return (
    <main
      className="flex min-h-svh items-center justify-center bg-background px-5 text-sm text-muted-foreground"
      aria-live="polite"
    >
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
    <main className="flex min-h-svh items-center justify-center bg-background px-5">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center" role="alert">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button type="button" variant="outline" onClick={retry}>
          Reintentar
        </Button>
      </div>
    </main>
  );
}
