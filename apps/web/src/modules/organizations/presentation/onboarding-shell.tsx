import type { ReactNode } from "react";
import { Logo } from "@futrob/ui";

interface OnboardingShellProps {
  children: ReactNode;
}

export function OnboardingShell({ children }: Readonly<OnboardingShellProps>) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-5xl items-center gap-2.5 px-5 sm:px-8">
        <Logo className="h-8 w-auto" />
        <span className="font-semibold tracking-wide">Futrob</span>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <header className="mb-10 max-w-2xl">
          <h1 className="type-title text-3xl sm:text-4xl">Configura tu espacio</h1>
          <p className="type-body mt-3 text-muted-foreground sm:text-lg">
            Crea una organización para gestionar tu competición, o acepta una invitación si ya te
            sumaron a un equipo.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">{children}</div>
      </section>
    </main>
  );
}
