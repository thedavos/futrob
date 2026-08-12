"use client";

import { ChoiceGroup, ChoiceGroupIndicator, ChoiceGroupItem, type Icon } from "@futrob/ui";
import { TicketIcon, TrophyIcon, UserIcon } from "@phosphor-icons/react";
import type { OnboardingPathDto } from "@futrob/api-contracts";
import { ONBOARDING_PATH } from "@futrob/identity";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { intentionSteps, stepsForPath } from "../onboarding-step-meta.ts";

export function IntentChoiceStep() {
  const flow = useOnboardingFlow();
  const { t } = useI18n();
  return (
    <OnboardingShell
      currentStepId="intention"
      description={t("onboarding.intention.description")}
      error={flow.error}
      steps={flow.path ? stepsForPath(t, flow.path) : intentionSteps(t)}
      title={t("onboarding.intention.title")}
    >
      <ChoiceGroup<OnboardingPathDto | "">
        aria-label={t("onboarding.intention.aria")}
        className="grid-cols-1 sm:grid-cols-3"
        onValueChange={(value) => value && flow.setPath(value)}
        value={flow.path ?? ""}
      >
        <IntentChoice
          icon={TrophyIcon}
          label={t("onboarding.intention.organization.label")}
          value={ONBOARDING_PATH.organization}
        >
          {t("onboarding.intention.organization.description")}
        </IntentChoice>
        <IntentChoice
          icon={TicketIcon}
          label={t("onboarding.intention.invitation.label")}
          value={ONBOARDING_PATH.invitation}
        >
          {t("onboarding.intention.invitation.description")}
        </IntentChoice>
        <IntentChoice
          icon={UserIcon}
          label={t("onboarding.intention.player.label")}
          value={ONBOARDING_PATH.player}
        >
          {t("onboarding.intention.player.description")}
        </IntentChoice>
      </ChoiceGroup>
      <OnboardingActions
        disabled={!flow.path}
        loading={flow.saving}
        onPrimary={() => {
          if (!flow.path) return;
          const next =
            flow.path === ONBOARDING_PATH.organization
              ? "organization"
              : flow.path === ONBOARDING_PATH.invitation
                ? "invitation"
                : "game-account";
          void flow.goTo(next, flow.path);
        }}
        primaryLabel={t("onboarding.intention.continue")}
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
  readonly icon: Icon;
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
