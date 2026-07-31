import { Check } from "lucide-react";

import { cn } from "#lib/utils";

export interface StepperStep {
  readonly id: string;
  readonly label: string;
}

interface StepperProps {
  readonly steps: readonly StepperStep[];
  readonly currentStepId: string;
  readonly className?: string;
  readonly "aria-label"?: string;
}

function Stepper({
  steps,
  currentStepId,
  className,
  "aria-label": ariaLabel = "Progreso",
}: StepperProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === currentStepId),
  );

  return (
    <nav aria-label={ariaLabel} className={cn("w-full", className)} data-slot="stepper">
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const completed = index < currentIndex;
          const current = index === currentIndex;
          return (
            <li
              aria-current={current ? "step" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
              data-status={completed ? "completed" : current ? "current" : "upcoming"}
              key={step.id}
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-1/2 top-3.5 h-px w-full bg-border transition-[background-color] duration-(--duration-normal)",
                    index < currentIndex && "bg-primary",
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full border border-input bg-surface text-xs font-semibold text-muted-foreground transition-[background-color,border-color,color] duration-(--duration-normal)",
                  completed && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary bg-accent text-accent-foreground",
                )}
              >
                {completed ? <Check className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  "typo-caption max-sm:sr-only",
                  completed && "font-medium text-muted-foreground",
                  current && "font-semibold text-foreground",
                  !completed && !current && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="typo-caption mt-3 text-center text-muted-foreground sm:hidden">
        Paso {currentIndex + 1} de {steps.length} · {steps[currentIndex]?.label}
      </p>
    </nav>
  );
}

export { Stepper };
