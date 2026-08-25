import type { CSSProperties } from "react";
import { CheckIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";
import { typography } from "#styles/typography";

export interface StepperStep {
  readonly id: string;
  readonly label: string;
}

interface StepperProps {
  readonly steps: readonly StepperStep[];
  readonly currentStepId: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly "aria-label"?: string;
  readonly mobileSummary?: (current: number, total: number, label: string) => string;
}

const styles = stylex.create({
  root: {
    width: "100%",
  },
  list: {
    display: "flex",
    alignItems: "flex-start",
  },
  item: {
    position: "relative",
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    textAlign: "center",
  },
  connector: {
    position: "absolute",
    left: "50%",
    top: "0.875rem",
    height: 1,
    width: "100%",
    backgroundColor: colors.border,
    transitionProperty: "background-color",
    transitionDuration: "var(--duration-normal)",
  },
  connectorCompleted: {
    backgroundColor: colors.primary,
  },
  marker: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    width: "1.75rem",
    height: "1.75rem",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-full)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.input,
    backgroundColor: colors.surface,
    fontSize: "0.75rem",
    lineHeight: "1rem",
    fontWeight: 600,
    color: colors.mutedForeground,
    transitionProperty: "background-color, border-color, color",
    transitionDuration: "var(--duration-normal)",
  },
  markerCompleted: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
  },
  markerCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
    color: colors.accentForeground,
  },
  markerIcon: {
    width: "1rem",
    height: "1rem",
  },
  label: {
    color: colors.mutedForeground,
  },
  labelCompleted: {
    fontWeight: 500,
    color: colors.mutedForeground,
  },
  labelCurrent: {
    fontWeight: 600,
    color: colors.foreground,
  },
  labelSrOnly: {
    position: {
      default: null,
      [media.maxSm]: "absolute",
    },
    width: {
      default: null,
      [media.maxSm]: 1,
    },
    height: {
      default: null,
      [media.maxSm]: 1,
    },
    padding: {
      default: null,
      [media.maxSm]: 0,
    },
    margin: {
      default: null,
      [media.maxSm]: -1,
    },
    overflow: {
      default: null,
      [media.maxSm]: "hidden",
    },
    clip: {
      default: null,
      [media.maxSm]: "rect(0, 0, 0, 0)",
    },
    whiteSpace: {
      default: null,
      [media.maxSm]: "nowrap",
    },
    borderWidth: {
      default: null,
      [media.maxSm]: 0,
    },
  },
  mobileSummary: {
    marginTop: "0.75rem",
    textAlign: "center",
    color: colors.mutedForeground,
    display: {
      default: "block",
      [media.sm]: "none",
    },
  },
});

function Stepper({
  steps,
  currentStepId,
  className,
  style,
  mobileSummary = defaultMobileSummary,
  "aria-label": ariaLabel = "Progreso",
}: StepperProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === currentStepId),
  );

  return (
    <nav aria-label={ariaLabel} data-slot="stepper" {...applyProps(className, style, styles.root)}>
      <ol {...applyProps(undefined, undefined, styles.list)}>
        {steps.map((step, index) => {
          const completed = index < currentIndex;
          const current = index === currentIndex;
          return (
            <li
              aria-current={current ? "step" : undefined}
              data-status={completed ? "completed" : current ? "current" : "upcoming"}
              key={step.id}
              {...applyProps(undefined, undefined, styles.item)}
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  {...applyProps(
                    undefined,
                    undefined,
                    styles.connector,
                    index < currentIndex && styles.connectorCompleted,
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                {...applyProps(
                  undefined,
                  undefined,
                  styles.marker,
                  completed && styles.markerCompleted,
                  current && styles.markerCurrent,
                )}
              >
                {completed ? (
                  <CheckIcon {...applyProps(undefined, undefined, styles.markerIcon)} />
                ) : (
                  index + 1
                )}
              </span>
              <span
                {...applyProps(
                  undefined,
                  undefined,
                  typography.caption,
                  styles.label,
                  styles.labelSrOnly,
                  completed && styles.labelCompleted,
                  current && styles.labelCurrent,
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p {...applyProps(undefined, undefined, typography.caption, styles.mobileSummary)}>
        {mobileSummary(currentIndex + 1, steps.length, steps[currentIndex]?.label ?? "")}
      </p>
    </nav>
  );
}

function defaultMobileSummary(current: number, total: number, label: string): string {
  return `Paso ${current} de ${total} · ${label}`;
}

export { Stepper };
