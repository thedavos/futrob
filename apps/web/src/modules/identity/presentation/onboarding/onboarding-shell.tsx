import { useEffect, useRef, type ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, colors, Logo, media, Stepper, typography, type StepperStep } from "@futrob/ui";
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

const styles = stylex.create({
  main: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    color: colors.foreground,
  },
  inner: {
    marginInline: "auto",
    display: "flex",
    minHeight: "100svh",
    width: "100%",
    maxWidth: "64rem",
    flexDirection: "column",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "1.5rem",
      [media.sm]: "2.5rem",
    },
  },
  chrome: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "0.75rem",
  },
  logo: {
    gridColumnStart: 2,
    height: "2.5rem",
    width: "auto",
  },
  locale: {
    gridColumnStart: 3,
    justifySelf: "end",
  },
  stepper: {
    marginInline: "auto",
    marginTop: {
      default: "1.5rem",
      [media.sm]: "2rem",
    },
    maxWidth: "36rem",
  },
  body: {
    marginInline: "auto",
    display: "flex",
    width: "100%",
    maxWidth: "48rem",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    paddingTop: {
      default: "2rem",
      [media.sm]: "2.5rem",
    },
  },
  header: {
    marginInline: "auto",
    marginBottom: {
      default: "1.5rem",
      [media.sm]: "2rem",
    },
    display: "grid",
    maxWidth: "42rem",
    gap: "0.75rem",
    textAlign: "center",
  },
  title: {
    fontSize: {
      default: "1.875rem",
      [media.sm]: "2.25rem",
    },
    lineHeight: {
      default: "2.25rem",
      [media.sm]: "2.5rem",
    },
    outlineWidth: 0,
    outlineStyle: "none",
  },
  description: {
    color: colors.mutedForeground,
  },
  error: {
    marginBottom: "1.5rem",
    outlineWidth: 0,
    outlineStyle: "none",
  },
});

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
  const logo = applyStyles(styles.logo);
  const stepper = applyStyles(styles.stepper);

  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.chrome)}>
          <Logo className={logo.className} style={logo.style} title="Futrob" />
          <div {...applyStyles(styles.locale)}>
            <LocaleSelect />
          </div>
        </div>
        <Stepper
          aria-label={t("onboarding.shell.progress")}
          className={stepper.className}
          currentStepId={currentStepId}
          mobileSummary={(current, total, label) =>
            t("onboarding.shell.stepSummary", { current, label, total })
          }
          steps={steps}
          style={stepper.style}
        />

        <section {...applyStyles(styles.body)}>
          <header {...applyStyles(styles.header)}>
            <h1 ref={titleRef} tabIndex={-1} {...applyStyles(typography.heading, styles.title)}>
              {title}
            </h1>
            <p {...applyStyles(typography.subtitle, styles.description)}>{description}</p>
          </header>
          {error ? (
            <div ref={errorRef} tabIndex={-1} {...applyStyles(styles.error)}>
              <SupportErrorAlert copy={supportCopy} error={error} />
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}
