"use client";

import { ChoiceGroup, ChoiceGroupIndicator, ChoiceGroupItem } from "@futrob/ui";
import { TicketCheck, Trophy, UserRound, type LucideIcon } from "lucide-react";
import type { OnboardingPathDto } from "@futrob/api-contracts";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { intentionSteps, stepsByPath } from "../onboarding-step-meta.ts";

export function IntentChoiceStep() {
  const flow = useOnboardingFlow();
  return (
    <OnboardingShell
      currentStepId="intention"
      description="Esto nos ayuda a preparar Futrob para lo que quieres hacer primero."
      error={flow.error}
      steps={flow.path ? stepsByPath[flow.path] : intentionSteps}
      title="¿Qué quieres hacer primero?"
    >
      <ChoiceGroup<OnboardingPathDto | "">
        aria-label="Intención del onboarding"
        className="grid-cols-1 sm:grid-cols-3"
        onValueChange={(value) => value && flow.setPath(value)}
        value={flow.path ?? ""}
      >
        <IntentChoice icon={Trophy} label="Organizar" value="organization">
          Crea una organización y una competición.
        </IntentChoice>
        <IntentChoice icon={TicketCheck} label="Unirme" value="invitation">
          Accede a una competición con tu código.
        </IntentChoice>
        <IntentChoice icon={UserRound} label="Empezar como jugador" value="player">
          Crea tu espacio personal.
        </IntentChoice>
      </ChoiceGroup>
      <OnboardingActions
        disabled={!flow.path}
        loading={flow.saving}
        onPrimary={() => {
          if (!flow.path) return;
          const next =
            flow.path === "organization"
              ? "organization"
              : flow.path === "invitation"
                ? "invitation"
                : "game-account";
          void flow.goTo(next, flow.path);
        }}
        primaryLabel="Continuar"
      />
    </OnboardingShell>
  );
}

function IntentChoice({
  icon: Icon,
  label,
  value,
  children,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: OnboardingPathDto;
  readonly children: string;
}) {
  return (
    <ChoiceGroupItem value={value}>
      <ChoiceGroupIndicator />
      <Icon aria-hidden="true" className="size-8" />
      <span className="grid min-w-0 gap-1">
        <span className="font-semibold">{label}</span>
        <span className="typo-caption text-muted-foreground">{children}</span>
      </span>
    </ChoiceGroupItem>
  );
}
