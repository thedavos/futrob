import type { ReactNode } from "react";
import { InfoIcon } from "@phosphor-icons/react";

export function OnboardingHint({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="mt-3 sm:mt-4">
      <p className="typo-caption flex items-start justify-center gap-2 text-muted-foreground">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{children}</span>
      </p>
    </div>
  );
}
