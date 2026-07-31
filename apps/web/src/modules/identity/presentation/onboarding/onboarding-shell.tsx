import { useEffect, useRef, type ReactNode } from "react";
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, [currentStepId]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <Logo className="mx-auto h-10 w-auto" title="Futrob" />
        <Stepper
          aria-label="Progreso del onboarding"
          className="mx-auto mt-6 max-w-xl sm:mt-8"
          currentStepId={currentStepId}
          steps={steps}
        />

        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col pt-8 sm:pt-10">
          <header className="mx-auto mb-6 grid max-w-2xl gap-3 text-center sm:mb-8">
            <h1
              className="typo-heading text-3xl outline-none sm:text-4xl"
              ref={titleRef}
              tabIndex={-1}
            >
              {title}
            </h1>
            <p className="typo-subtitle text-muted-foreground">{description}</p>
          </header>
          {error ? (
            <Alert className="mb-6 outline-none" ref={errorRef} tabIndex={-1} variant="destructive">
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
