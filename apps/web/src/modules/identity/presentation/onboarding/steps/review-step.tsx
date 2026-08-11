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
import { OnboardingActions } from "../onboarding-actions.tsx";
import {
  validCompleteAccount,
  validOptionalAccount,
  validOrganizationName,
} from "../onboarding-draft-validators.ts";
import { competitionFromDraft, useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import {
  eaPlatformLabel,
  formatLabel,
  platformLabel,
  stepsByPath,
} from "../onboarding-step-meta.ts";

export function OnboardingReview() {
  const flow = useOnboardingFlow();
  const path = flow.path ?? "player";
  const rows = reviewRows(flow);
  const canFinish =
    path === "organization"
      ? validOrganizationName(flow.draft.organizationName) &&
        Boolean(competitionFromDraft(flow.draft)) &&
        validOptionalAccount(flow.draft)
      : path === "invitation"
        ? Boolean(flow.draft.invitationToken.trim()) && validOptionalAccount(flow.draft)
        : validOptionalAccount(flow.draft);
  const previous: OnboardingStepDto = path === "player" ? "team" : "game-account";
  const primaryLabel =
    path === "organization"
      ? "Crear organización y competición"
      : path === "invitation"
        ? "Aceptar invitación"
        : "Entrar a mi espacio";

  return (
    <OnboardingShell
      currentStepId="review"
      description="Revisa qué se guardará al confirmar. Si recargas o cierras esta página antes de confirmar, tendrás que completar los datos otra vez."
      error={flow.error}
      steps={stepsByPath[path]}
      title="Confirma tu configuración"
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
                    <Badge variant="neutral">Pendiente</Badge>
                  )}
                  {row.editStep ? (
                    <Button
                      aria-label={`Editar ${row.label.toLowerCase()}`}
                      onClick={() => void flow.goTo(row.editStep!, path)}
                      variant="link"
                    >
                      Editar
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
          Completa los datos pendientes antes de confirmar.
        </p>
      ) : null}
      <OnboardingActions
        disabled={!canFinish}
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

function reviewRows(flow: ReturnType<typeof useOnboardingFlow>): readonly OnboardingReviewRow[] {
  const selectedPath = flow.path ?? "player";
  const intention = {
    organization: "Organizar",
    invitation: "Unirme",
    player: "Empezar como jugador",
  }[selectedPath];
  const base: OnboardingReviewRow = {
    label: "Cómo empezarás",
    value: intention,
    icon: SignpostIcon,
    editStep: "intention",
  };
  if (flow.path === "organization") {
    return [
      base,
      {
        label: "Organización",
        value: flow.draft.organizationName.trim() || null,
        icon: UsersThreeIcon,
        editStep: "organization",
      },
      {
        label: "Competición",
        value: competitionFromDraft(flow.draft)
          ? `${flow.draft.competitionName.trim()} · ${formatLabel(flow.draft.competitionFormat!)} · ${platformLabel(flow.draft.competitionPlatform!)}`
          : null,
        icon: TrophyIcon,
        editStep: "competition",
      },
      accountReviewRow(flow),
    ];
  }
  if (flow.path === "invitation") {
    return [
      base,
      {
        label: "Competición",
        value: flow.draft.invitationToken.trim() ? "Invitación lista para validar" : null,
        icon: TicketIcon,
        editStep: "invitation",
      },
      accountReviewRow(flow),
    ];
  }
  return [base, accountReviewRow(flow), clubReviewRow(flow)];
}

function accountReviewRow(flow: ReturnType<typeof useOnboardingFlow>): OnboardingReviewRow {
  const accountComplete = validCompleteAccount(flow.draft);
  return {
    label: "Cuenta de juego",
    value: accountComplete
      ? `${flow.draft.gameAccountIdentifier.trim()} · ${platformLabel(flow.draft.platform!)} · ${flow.draft.gameEdition.trim()}`
      : "Perfil de jugador listo · Datos EA para después",
    icon: UserIcon,
    editStep: "game-account",
  };
}

function clubReviewRow(flow: ReturnType<typeof useOnboardingFlow>): OnboardingReviewRow {
  const club = flow.draft.selectedExternalClub;
  return {
    label: "Club EA",
    value: club
      ? `${club.name} · ${eaPlatformLabel(club.platform)} · ID ${club.externalClubId}`
      : "Sin club asociado por ahora",
    icon: ShieldIcon,
    editStep: "team",
  };
}
