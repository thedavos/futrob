import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/onboarding/")({
  head: () => ({ meta: [{ title: "Preparando tu configuración | Futrob" }] }),
  component: OnboardingIndex,
});

function OnboardingIndex() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 text-sm text-muted-foreground">
      Recuperando tu progreso…
    </main>
  );
}
