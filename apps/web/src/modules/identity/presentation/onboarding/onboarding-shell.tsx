import { useEffect, useRef, type ReactNode } from "react";
import { Logo, Stepper, type StepperStep } from "@futrob/ui";
import {
  SupportErrorAlert,
  type SupportError,
  type SupportErrorAlertCopy,
} from "@/shared/presentation/support-error-alert.tsx";
import { LocaleSelect } from "@/shared/presentation/i18n/locale-select.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

interface OnboardingShellProps {
  readonly steps: readonly StepperStep[];
  readonly currentStepId: string;
  readonly title: string;
  readonly description: string;
  readonly error?: SupportError | null;
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
  const { t } = useI18n();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, [currentStepId]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    document.title = `${title} | Futrob`;
  }, [title]);

  const supportCopy: SupportErrorAlertCopy = {
    retryAfter: (seconds) => t("support.retryAfter", { seconds }),
    codeLabel: t("support.codeLabel"),
    copyAria: t("support.copy.aria"),
    copyAction: t("support.copy.action"),
    copyDone: t("support.copy.done"),
    copySuccess: t("support.copy.success"),
    copyFailure: t("support.copy.failure"),
  };

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Logo className="col-start-2 h-10 w-auto" title="Futrob" />
          <div className="col-start-3 justify-self-end">
            <LocaleSelect />
          </div>
        </div>
        <Stepper
          aria-label={t("onboarding.shell.progress")}
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
            <div className="mb-6 outline-none" ref={errorRef} tabIndex={-1}>
              <SupportErrorAlert copy={supportCopy} error={error} />
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}
