import type { ReactNode } from "react";
import { Info } from "lucide-react";

export function OnboardingHint({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="typo-caption flex items-start justify-center gap-2 text-muted-foreground">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
