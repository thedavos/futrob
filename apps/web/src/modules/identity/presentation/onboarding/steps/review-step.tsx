"use client";

import { Badge, Button, Card, CardContent, type Icon } from "@futrob/ui";
import {
  ShieldIcon,
  SignpostIcon,
  TicketIcon,
  TrophyIcon,
  UserIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import type { OnboardingStepDto } from "@futrob/api-contracts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { OnboardingActions } from "../onboarding-actions.tsx";
import {
  validCompleteAccount,
  validOptionalAccount,
  validOrganizationName,
} from "../onboarding-draft-validators.ts";
import { competitionFromDraft } from "../onboarding-draft.ts";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import {
  eaPlatformLabel,
  formatLabel,
  platformLabel,
  stepsForPath,
} from "../onboarding-step-meta.ts";

export function OnboardingReview() {
  const flow = useOnboardingFlow();
  const { t } = useI18n();
  const path = flow.path ?? "player";
  const rows = reviewRows(flow, t);
  const canFinish =
    path === "organization"
      ? validOrganizationName(flow.draft.organizationName) &&
        Boolean(competitionFromDraft(flow.draft)) &&
        validOptionalAccount(flow.draft)
      : path === "invitation"
        ? Boolean(flow.draft.invitationPreview) && validOptionalAccount(flow.draft)
        : validOptionalAccount(flow.draft);
  const previous: OnboardingStepDto = path === "player" ? "club" : "game-account";
  const primaryLabel = flow.retryBlocked
    ? t("onboarding.review.retry", { seconds: flow.retryAfterSeconds })
    : path === "organization"
      ? t("onboarding.review.finish.organization")
      : path === "invitation"
        ? t("onboarding.review.finish.invitation")
        : t("onboarding.review.finish.player");

  return (
    <OnboardingShell
      currentStepId="review"
      description={t("onboarding.review.description")}
      error={flow.error}
      steps={stepsForPath(t, path)}
      title={t("onboarding.review.title")}
    >
      <Card className="mx-auto w-full max-w-2xl" variant="elevated">
        <CardContent className="p-0">
          <dl>
            {rows.map((row) => (
              <div
                className="grid min-h-16 gap-1 border-t border-border-subtle px-5 py-4 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-6 sm:px-6"
                key={row.label}
              >
                <dt className="flex items-center gap-3 font-semibold">
                  <row.icon aria-hidden="true" className="size-5" />
                  {row.label}
                </dt>
                <dd className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pl-8 text-left sm:flex sm:justify-end sm:pl-0 sm:text-right">
                  {row.value ? (
                    <span>{row.value}</span>
                  ) : (
                    <Badge variant="neutral">{t("common.pending")}</Badge>
                  )}
                  {row.editStep ? (
                    <Button
                      aria-label={t("onboarding.review.edit", { label: row.label })}
                      onClick={() => void flow.goTo(row.editStep!, path)}
                      variant="link"
                    >
                      {t("common.edit")}
                    </Button>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {!canFinish ? (
        <p className="mt-4 text-center typo-caption text-muted-foreground">
          {t("onboarding.review.incomplete")}
        </p>
      ) : null}
      <OnboardingActions
        disabled={!canFinish || flow.retryBlocked}
        loading={flow.saving}
        onBack={() => void flow.goTo(previous, path)}
        onPrimary={() => void flow.finish()}
        primaryLabel={primaryLabel}
      />
    </OnboardingShell>
  );
}

interface OnboardingReviewRow {
  readonly label: string;
  readonly value: string | null;
  readonly icon: Icon;
  readonly editStep?: OnboardingStepDto;
}

function reviewRows(
  flow: ReturnType<typeof useOnboardingFlow>,
  t: Translator,
): readonly OnboardingReviewRow[] {
  const selectedPath = flow.path ?? "player";
  const intention = {
    organization: t("onboarding.intention.organization.label"),
    invitation: t("onboarding.intention.invitation.label"),
    player: t("onboarding.intention.player.label"),
  }[selectedPath];
  const base: OnboardingReviewRow = {
    label: t("onboarding.review.startingAs"),
    value: intention,
    icon: SignpostIcon,
    editStep: "intention",
  };
  if (flow.path === "organization") {
    return [
      base,
      {
        label: t("onboarding.review.organization"),
        value: flow.draft.organizationName.trim() || null,
        icon: UsersThreeIcon,
        editStep: "organization",
      },
      {
        label: t("onboarding.review.competition"),
        value: competitionFromDraft(flow.draft)
          ? `${flow.draft.competitionName.trim()} · ${formatLabel(flow.draft.competitionFormat!, t)} · ${platformLabel(flow.draft.competitionPlatform!)}`
          : null,
        icon: TrophyIcon,
        editStep: "competition",
      },
      accountReviewRow(flow, t),
    ];
  }
  if (flow.path === "invitation") {
    const preview = flow.draft.invitationPreview;
    return [
      base,
      {
        label: t("onboarding.review.organization"),
        value: preview?.organizationName ?? null,
        icon: UsersThreeIcon,
        editStep: "invitation",
      },
      {
        label: t("onboarding.review.competition"),
        value: preview?.competitionName ?? null,
        icon: TicketIcon,
        editStep: "invitation",
      },
      {
        label: t("onboarding.review.invitationRole"),
        value: preview ? invitationRoleLabel(preview.competitionRole, t) : null,
        icon: ShieldIcon,
      },
      {
        label: t("onboarding.review.invitationExpires"),
        value: preview ? formatInvitationExpiry(preview.expiresAt, t.locale) : null,
        icon: TicketIcon,
      },
      accountReviewRow(flow, t),
    ];
  }
  return [base, accountReviewRow(flow, t), clubReviewRow(flow, t)];
}

function invitationRoleLabel(role: "staff" | "captain" | "player", t: Translator): string {
  return {
    staff: t("onboarding.review.invitationRole.staff"),
    captain: t("onboarding.review.invitationRole.captain"),
    player: t("onboarding.review.invitationRole.player"),
  }[role];
}

function formatInvitationExpiry(value: string, locale: "es" | "en"): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-PE" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function accountReviewRow(
  flow: ReturnType<typeof useOnboardingFlow>,
  t: Translator,
): OnboardingReviewRow {
  const accountComplete = validCompleteAccount(flow.draft);
  return {
    label: t("onboarding.review.gameAccount"),
    value: accountComplete
      ? `${flow.draft.gameAccountIdentifier.trim()} · ${platformLabel(flow.draft.platform!)} · ${flow.draft.gameEdition.trim()}`
      : t("onboarding.review.playerReady"),
    icon: UserIcon,
    editStep: "game-account",
  };
}

function clubReviewRow(
  flow: ReturnType<typeof useOnboardingFlow>,
  t: Translator,
): OnboardingReviewRow {
  const club = flow.draft.selectedExternalClub;
  return {
    label: t("onboarding.review.club"),
    value: club
      ? `${club.name} · ${eaPlatformLabel(club.platform)} · ID ${club.externalClubId}`
      : t("onboarding.review.noClub"),
    icon: ShieldIcon,
    editStep: "club",
  };
}
