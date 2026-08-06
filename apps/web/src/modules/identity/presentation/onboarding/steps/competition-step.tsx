"use client";

import { useRef, useState } from "react";
import { CompetitionDraftFields } from "@/modules/competitions/presentation/competition-draft-fields.tsx";
import {
  type CompetitionDraftFieldError,
  validateCompetitionDraftFields,
} from "@/modules/competitions/presentation/validate-competition-draft-input.ts";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { stepsByPath } from "../onboarding-step-meta.ts";

export function CompetitionStep() {
  const flow = useOnboardingFlow();
  const nameRef = useRef<HTMLInputElement>(null);
  const timeZoneRef = useRef<HTMLButtonElement>(null);
  const [fieldError, setFieldError] = useState<CompetitionDraftFieldError | null>(null);
  const draft = flow.draft;

  function invalidate(error: CompetitionDraftFieldError) {
    setFieldError(error);
    if (error.field === "name") nameRef.current?.focus();
    else if (error.field === "edition") {
      if (draft.customCompetitionGameEdition) {
        document.querySelector<HTMLElement>("[data-competition-edition] input")?.focus();
      } else {
        document.querySelector<HTMLElement>("[data-competition-edition] [role=radio]")?.focus();
      }
    } else if (error.field === "platform") {
      document.querySelector<HTMLElement>("[data-competition-platform] [role=radio]")?.focus();
    } else if (error.field === "time-zone") timeZoneRef.current?.focus();
    else {
      document.querySelector<HTMLElement>(`[data-competition-${error.field}] button`)?.focus();
    }
  }

  function continueToAccount() {
    const fields = {
      name: draft.competitionName,
      gameEdition: draft.competitionGameEdition,
      customEdition: draft.customCompetitionGameEdition,
      platform: draft.competitionPlatform,
      region: draft.competitionRegion,
      timeZone: draft.competitionTimeZone,
      format: draft.competitionFormat,
    };
    const validation = validateCompetitionDraftFields(fields);
    if (validation) {
      invalidate(validation);
      return;
    }

    flow.updateDraft({
      competitionName: draft.competitionName.trim(),
      competitionGameEdition: draft.competitionGameEdition.trim(),
      competitionTimeZone: draft.competitionTimeZone.trim(),
    });
    void flow.goTo("game-account", "organization");
  }

  return (
    <OnboardingShell
      currentStepId="competition"
      description="Crea un borrador de FC Clubs. Configurarás los equipos, el calendario y la publicación después."
      error={flow.error}
      steps={stepsByPath.organization}
      title="Configura tu primera competición"
    >
      <div className="mx-auto w-full max-w-2xl">
        <CompetitionDraftFields
          fieldError={fieldError}
          nameInputRef={nameRef}
          onChange={(patch) => {
            flow.updateDraft({
              ...(patch.name !== undefined ? { competitionName: patch.name } : {}),
              ...(patch.gameEdition !== undefined
                ? { competitionGameEdition: patch.gameEdition }
                : {}),
              ...(patch.customEdition !== undefined
                ? { customCompetitionGameEdition: patch.customEdition }
                : {}),
              ...(patch.platform !== undefined ? { competitionPlatform: patch.platform } : {}),
              ...(patch.region !== undefined ? { competitionRegion: patch.region } : {}),
              ...(patch.timeZone !== undefined ? { competitionTimeZone: patch.timeZone } : {}),
              ...(patch.format !== undefined ? { competitionFormat: patch.format } : {}),
            });
          }}
          onClearFieldError={() => setFieldError(null)}
          showFormatDescription
          timeZoneTriggerRef={timeZoneRef}
          value={{
            name: draft.competitionName,
            gameEdition: draft.competitionGameEdition,
            customEdition: draft.customCompetitionGameEdition,
            platform: draft.competitionPlatform,
            region: draft.competitionRegion,
            timeZone: draft.competitionTimeZone,
            format: draft.competitionFormat,
          }}
        />
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => void flow.goTo("organization", "organization")}
        onPrimary={continueToAccount}
        primaryLabel="Configurar cuenta"
      />
    </OnboardingShell>
  );
}
