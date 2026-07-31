import type { ReactNode } from "react";
import { Alert, AlertDescription, Logo, Stepper, type StepperStep } from "@futrob/ui";
import { CircleAlert } from "lucide-react";

interface OnboardingShellProps {
  readonly steps: readonly StepperStep[];
  readonly currentStepId: string;
  readonly title: string;
  readonly description: string;
  readonly error?: string | null;
  readonly children: ReactNode;
}

export function OnboardingShell({
  steps,
  currentStepId,
  title,
  description,
  error,
  children,
}: OnboardingShellProps) {
  return (
    <main className="min-h-svh bg-background p-0 text-foreground sm:p-5">
      <div className="mx-auto flex min-h-svh w-full max-w-(--content-wide) flex-col bg-surface px-5 py-7 sm:min-h-[calc(100svh-2.5rem)] sm:rounded-xl sm:border sm:border-border sm:px-8 sm:py-10">
        <Logo className="mx-auto h-12 w-auto" title="Futrob" />
        <Stepper
          aria-label="Progreso del onboarding"
          className="mx-auto mt-10 max-w-3xl"
          currentStepId={currentStepId}
          steps={steps}
        />

        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col pt-10 sm:pt-12">
          <header className="mx-auto mb-8 max-w-2xl text-center">
            <h1 className="typo-heading text-3xl sm:text-4xl">{title}</h1>
            <p className="typo-subtitle mt-3 text-muted-foreground">{description}</p>
          </header>
          {error ? (
            <Alert className="mb-6" variant="destructive">
              <CircleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}
