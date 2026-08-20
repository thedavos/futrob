"use client";

import { useRef, useState } from "react";
import { CompetitionDraftFields } from "@/modules/competitions/presentation/competition-draft-fields.tsx";
import {
  type CompetitionDraftFieldError,
  type CompetitionDraftFieldsValue,
  validateCompetitionDraftFields,
} from "@/modules/competitions/presentation/validate-competition-draft-input.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import {
  localizedCompetitionFormats,
  localizedCompetitionRegions,
  stepsForPath,
} from "../onboarding-step-meta.ts";
import type { OnboardingDraft } from "../onboarding-flow.tsx";

export function CompetitionStep() {
  const flow = useOnboardingFlow();
  const { t } = useI18n();
  const nameRef = useRef<HTMLInputElement>(null);
  const timeZoneRef = useRef<HTMLButtonElement>(null);
  const [fieldError, setFieldError] = useState<CompetitionDraftFieldError | null>(null);
  const draft = flow.draft;
  const fields: CompetitionDraftFieldsValue = {
    name: draft.competitionName,
    gameEdition: draft.competitionGameEdition,
    customEdition: draft.customCompetitionGameEdition,
    platform: draft.competitionPlatform,
    region: draft.competitionRegion,
    timeZone: draft.competitionTimeZone,
    format: draft.competitionFormat,
  };
  const localizedFieldError = localizeValidation(fieldError, fields, t);

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
      description={t("onboarding.competition.description")}
      error={flow.error}
      steps={stepsForPath(t, "organization")}
      title={t("onboarding.competition.title")}
    >
      <div className="mx-auto w-full max-w-2xl">
        <CompetitionDraftFields
          copy={{
            nameLabel: t("onboarding.competition.name.label"),
            namePlaceholder: t("onboarding.competition.name.placeholder"),
            gameEdition: {
              legend: t("onboarding.competition.edition.legend"),
              other: t("onboarding.competition.edition.other"),
              customName: t("onboarding.competition.edition.name"),
              customPlaceholder: t("onboarding.competition.edition.placeholder"),
            },
            platformLabel: t("onboarding.competition.platform.label"),
            regionLabel: t("onboarding.competition.region.label"),
            regionPlaceholder: t("onboarding.competition.region.placeholder"),
            regions: localizedCompetitionRegions(t),
            timeZoneLabel: t("onboarding.competition.timeZone.label"),
            timeZonePlaceholder: t("onboarding.competition.timeZone.placeholder"),
            formatLabel: t("onboarding.competition.format.label"),
            initialFormatLabel: t("onboarding.competition.format.initial"),
            formatPlaceholder: t("onboarding.competition.format.placeholder"),
            formatDescription: t("onboarding.competition.format.description"),
            formats: localizedCompetitionFormats(t),
          }}
          fieldError={localizedFieldError}
          nameInputRef={nameRef}
          onChange={(patch) => {
            flow.updateDraft(competitionDraftUpdate(patch));
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
        primaryLabel={t("onboarding.competition.account")}
      />
    </OnboardingShell>
  );
}

function localizeValidation(
  error: CompetitionDraftFieldError | null,
  value: CompetitionDraftFieldsValue,
  t: Translator,
): CompetitionDraftFieldError | null {
  if (!error) return null;
  const message = {
    name: value.name.trim()
      ? t("onboarding.competition.validation.name.max")
      : t("onboarding.competition.validation.name.required"),
    edition: value.gameEdition.trim()
      ? t("onboarding.competition.validation.edition.max")
      : t("onboarding.competition.validation.edition.required"),
    platform: t("onboarding.competition.validation.platform"),
    region: t("onboarding.competition.validation.region"),
    "time-zone": t("onboarding.competition.validation.timeZone"),
    format: t("onboarding.competition.validation.format"),
  }[error.field];
  return { ...error, message };
}

type CompetitionDraftUpdate = Partial<{
  competitionName: OnboardingDraft["competitionName"];
  competitionGameEdition: OnboardingDraft["competitionGameEdition"];
  customCompetitionGameEdition: OnboardingDraft["customCompetitionGameEdition"];
  competitionPlatform: OnboardingDraft["competitionPlatform"];
  competitionRegion: OnboardingDraft["competitionRegion"];
  competitionTimeZone: OnboardingDraft["competitionTimeZone"];
  competitionFormat: OnboardingDraft["competitionFormat"];
}>;

function competitionDraftUpdate(
  patch: Partial<CompetitionDraftFieldsValue>,
): CompetitionDraftUpdate {
  const update: CompetitionDraftUpdate = {};
  if (patch.name !== undefined) update.competitionName = patch.name;
  if (patch.gameEdition !== undefined) update.competitionGameEdition = patch.gameEdition;
  if (patch.customEdition !== undefined) update.customCompetitionGameEdition = patch.customEdition;
  if (patch.platform !== undefined) update.competitionPlatform = patch.platform;
  if (patch.region !== undefined) update.competitionRegion = patch.region;
  if (patch.timeZone !== undefined) update.competitionTimeZone = patch.timeZone;
  if (patch.format !== undefined) update.competitionFormat = patch.format;
  return update;
}
