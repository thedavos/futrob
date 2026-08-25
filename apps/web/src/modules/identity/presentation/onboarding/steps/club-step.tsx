"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { providerGameEditionFromDraft } from "../onboarding-draft-validators.ts";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { stepsForPath } from "../onboarding-step-meta.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { EaClubLinkForm } from "@/modules/game-data/presentation/ea-club-link-form.tsx";

const styles = stylex.create({
  body: {
    marginInline: "auto",
    width: "100%",
    maxWidth: "42rem",
  },
});

export function ClubStep() {
  const flow = useOnboardingFlow();
  const { t } = useI18n();
  const selected = flow.draft.selectedExternalClub;

  return (
    <OnboardingShell
      currentStepId="club"
      description={t("onboarding.club.description")}
      error={flow.error}
      steps={stepsForPath(t, "player")}
      title={t("onboarding.club.title")}
    >
      <div {...applyStyles(styles.body)}>
        <EaClubLinkForm
          busy={flow.saving}
          initialPlatform={flow.draft.platform}
          onClear={() => flow.clearExternalClub()}
          onSelect={(club) => flow.updateDraft({ selectedExternalClub: club })}
          searchExternalClubs={(input) => flow.searchExternalClubs(input)}
          searchGameEdition={providerGameEditionFromDraft(flow.draft.gameEdition)}
          selected={selected}
        />
      </div>
      <OnboardingActions
        disabled={!selected}
        loading={flow.saving}
        onBack={() => void flow.goTo("game-account", "player")}
        onPrimary={() => void flow.goTo("review", "player")}
        onSkip={() => {
          flow.clearExternalClub();
          void flow.goTo("review", "player");
        }}
        primaryLabel={t("onboarding.club.review")}
      />
    </OnboardingShell>
  );
}
