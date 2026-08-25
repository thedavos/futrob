"use client";

import type { Icon } from "@futrob/ui";
import { cn } from "@futrob/ui";
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
  readonly dotClass: string;
  readonly iconClass: string;
}

const STEPS: readonly MechanismStep[] = [
  {
    key: "sync",
    icon: ArrowsClockwiseIcon,
    dotClass: "bg-info",
    iconClass: "text-info",
  },
  {
    key: "selection",
    icon: HandPointingIcon,
    dotClass: "bg-warning",
    iconClass: "text-warning",
  },
  {
    key: "approval",
    icon: SealCheckIcon,
    dotClass: "bg-approved",
    iconClass: "text-approved",
  },
  {
    key: "publication",
    icon: GlobeIcon,
    dotClass: "bg-foreground",
    iconClass: "text-foreground",
  },
];

export function MechanismSection() {
  const { t } = useI18n();
  return (
    <section className="border-t border-border-subtle" id="mecanismo">
      <div className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8 lg:py-28">
        <div className="flex max-w-2xl flex-col gap-6">
          <h2 className="typo-display text-balance">{t("landing.mechanism.title")}</h2>
          <p className="typo-subtitle text-muted-foreground sm:text-base">
            {t("landing.mechanism.subtitle")}
          </p>
        </div>
        <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((step) => (
            <li key={step.key}>
              <div aria-hidden="true" className="flex items-center gap-3">
                <span className={cn("size-2.5 shrink-0 rounded-full", step.dotClass)} />
                <span className="h-px flex-1 bg-border-subtle" />
              </div>
              <div className="mt-5 flex items-center gap-2.5">
                <step.icon aria-hidden="true" className={cn("size-5", step.iconClass)} />
                <h3 className="font-semibold">{t(`landing.mechanism.${step.key}.title`)}</h3>
              </div>
              <p className="typo-body mt-2 text-muted-foreground">
                {t(`landing.mechanism.${step.key}.description`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
