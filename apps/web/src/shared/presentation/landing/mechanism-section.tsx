"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography, type Icon } from "@futrob/ui";
import { colors, media } from "@futrob/ui/styles/public.stylex";
import {
  ArrowsClockwiseIcon,
  GlobeIcon,
  HandPointingIcon,
  SealCheckIcon,
} from "@phosphor-icons/react";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

interface MechanismStep {
  readonly key: "sync" | "selection" | "approval" | "publication";
  readonly icon: Icon;
}

const STEPS: readonly MechanismStep[] = [
  { key: "sync", icon: ArrowsClockwiseIcon },
  { key: "selection", icon: HandPointingIcon },
  { key: "approval", icon: SealCheckIcon },
  { key: "publication", icon: GlobeIcon },
];

const styles = stylex.create({
  section: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  inner: {
    marginInline: "auto",
    maxWidth: "80rem",
    scrollMarginTop: "2rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "5rem",
      [media.lg]: "7rem",
    },
  },
  copy: {
    display: "flex",
    maxWidth: "42rem",
    flexDirection: "column",
    gap: "1.5rem",
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: {
      default: null,
      [media.sm]: "var(--text-base)",
    },
    lineHeight: {
      default: null,
      [media.sm]: "1.5rem",
    },
  },
  list: {
    marginTop: "3rem",
    display: "grid",
    gap: {
      default: "2.5rem",
      [media.lg]: "2rem",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
  },
  rail: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  dot: {
    width: "0.625rem",
    height: "0.625rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  dotSync: {
    backgroundColor: colors.info,
  },
  dotSelection: {
    backgroundColor: colors.warning,
  },
  dotApproval: {
    backgroundColor: colors.approved,
  },
  dotPublication: {
    backgroundColor: colors.foreground,
  },
  railLine: {
    height: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    backgroundColor: colors.borderSubtle,
  },
  headingRow: {
    marginTop: "1.25rem",
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
  },
  icon: {
    width: "1.25rem",
    height: "1.25rem",
  },
  iconSync: {
    color: colors.info,
  },
  iconSelection: {
    color: colors.warning,
  },
  iconApproval: {
    color: colors.approved,
  },
  iconPublication: {
    color: colors.foreground,
  },
  title: {
    fontWeight: 600,
  },
  body: {
    marginTop: "0.5rem",
    color: colors.mutedForeground,
  },
});

const STEP_DOT = {
  sync: styles.dotSync,
  selection: styles.dotSelection,
  approval: styles.dotApproval,
  publication: styles.dotPublication,
} as const;

const STEP_ICON = {
  sync: styles.iconSync,
  selection: styles.iconSelection,
  approval: styles.iconApproval,
  publication: styles.iconPublication,
} as const;

export function MechanismSection() {
  const { t } = useI18n();
  return (
    <section id="mecanismo" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.copy)}>
          <h2 {...applyStyles(typography.display)}>{t("landing.mechanism.title")}</h2>
          <p {...applyStyles(typography.subtitle, styles.subtitle)}>
            {t("landing.mechanism.subtitle")}
          </p>
        </div>
        <ol {...applyStyles(styles.list)}>
          {STEPS.map((step) => {
            const icon = applyStyles(styles.icon, STEP_ICON[step.key]);
            return (
              <li key={step.key}>
                <div aria-hidden="true" {...applyStyles(styles.rail)}>
                  <span {...applyStyles(styles.dot, STEP_DOT[step.key])} />
                  <span {...applyStyles(styles.railLine)} />
                </div>
                <div {...applyStyles(styles.headingRow)}>
                  <step.icon aria-hidden="true" className={icon.className} style={icon.style} />
                  <h3 {...applyStyles(styles.title)}>{t(`landing.mechanism.${step.key}.title`)}</h3>
                </div>
                <p {...applyStyles(typography.body, styles.body)}>
                  {t(`landing.mechanism.${step.key}.description`)}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
