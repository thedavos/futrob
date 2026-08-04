"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import type {
  CompetitionDraftInputDto,
  CompetitionFormatDto,
  CompetitionRegionDto,
  CompleteInvitationOnboardingRequest,
  CompleteInvitationOnboardingResponse,
  CompleteOrganizationOnboardingRequest,
  CompleteOrganizationOnboardingResponse,
  CompletePlayerOnboardingRequest,
  ExternalClubDto,
  GamePlatformDto,
  OnboardingPathDto,
  OnboardingStatusDto,
  OnboardingStepDto,
  PlayerExternalClubSelectionInputDto,
  PlayerGameAccountInputDto,
  SearchClubsQueryInput,
} from "@futrob/api-contracts";
import {
  IdentityOnboardingClientError,
  identityBrowserClient,
} from "@/modules/identity/presentation/identity-browser-client.ts";
import { gameDataBrowserClient } from "@/modules/game-data/presentation/game-data-browser-client.ts";
import { RoutePendingState } from "@/shared/presentation/route-load-state.tsx";
import { resolveOnboardingStep, routeForOnboardingStep } from "./onboarding-routing.ts";

export interface SelectedExternalClubDraft extends PlayerExternalClubSelectionInputDto {
  readonly name: string;
  readonly imageUrl: string | null;
}

export interface OnboardingDraft {
  readonly organizationName: string;
  readonly competitionName: string;
  readonly competitionPlatform: GamePlatformDto | null;
  readonly competitionRegion: CompetitionRegionDto | null;
  readonly competitionTimeZone: string;
  readonly competitionFormat: CompetitionFormatDto | null;
  readonly competitionGameEdition: string;
  readonly customCompetitionGameEdition: boolean;
  readonly invitationToken: string;
  readonly gameAccountIdentifier: string;
  readonly platform: GamePlatformDto | null;
  readonly gameEdition: string;
  readonly customGameEdition: boolean;
  readonly selectedExternalClub: SelectedExternalClubDraft | null;
}

function createEmptyDraft(): OnboardingDraft {
  return {
    organizationName: "",
    competitionName: "",
    competitionPlatform: null,
    competitionRegion: null,
    competitionTimeZone: browserTimeZone(),
    competitionFormat: null,
    competitionGameEdition: "",
    customCompetitionGameEdition: false,
    invitationToken: "",
    gameAccountIdentifier: "",
    platform: null,
    gameEdition: "",
    customGameEdition: false,
    selectedExternalClub: null,
  };
}

export interface OnboardingGateway {
  checkOrganizationName(input: { readonly name: string }): Promise<{ readonly available: boolean }>;
  saveProgress: typeof identityBrowserClient.saveOnboardingProgress;
  createOrganization(
    input: CompleteOrganizationOnboardingRequest,
  ): Promise<CompleteOrganizationOnboardingResponse>;
  acceptInvitation(
    input: CompleteInvitationOnboardingRequest,
  ): Promise<CompleteInvitationOnboardingResponse>;
  completePlayer(input: CompletePlayerOnboardingRequest): Promise<void>;
  searchExternalClubs(input: SearchClubsQueryInput): Promise<readonly ExternalClubDto[]>;
}

export const browserOnboardingGateway: OnboardingGateway = {
  checkOrganizationName: (input) => identityBrowserClient.checkOrganizationName(input),
  saveProgress: (input) => identityBrowserClient.saveOnboardingProgress(input),
  createOrganization: (input) => identityBrowserClient.completeOrganizationOnboarding(input),
  acceptInvitation: (input) => identityBrowserClient.completeInvitationOnboarding(input),
  async completePlayer(input) {
    await identityBrowserClient.completePlayerOnboarding(input);
  },
  async searchExternalClubs(input) {
    const result = await gameDataBrowserClient.searchClubs(input);
    if (!result.isOk()) {
      throw result.error;
    }
    return result.value.clubs;
  },
};

interface OnboardingFlowValue {
  readonly saving: boolean;
  readonly error: string | null;
  readonly path: OnboardingPathDto | null;
  readonly currentStep: OnboardingStepDto;
  readonly draft: OnboardingDraft;
  setPath(path: OnboardingPathDto): void;
  updateDraft(patch: Partial<OnboardingDraft>): void;
  clearGameAccount(): void;
  clearExternalClub(): void;
  checkOrganizationName(name: string): Promise<boolean | null>;
  searchExternalClubs(input: SearchClubsQueryInput): Promise<readonly ExternalClubDto[]>;
  goTo(step: OnboardingStepDto, path?: OnboardingPathDto | null): Promise<void>;
  finish(): Promise<void>;
}

const OnboardingFlowContext = createContext<OnboardingFlowValue | null>(null);

export function OnboardingFlowProvider({
  children,
  initialStatus,
  gateway = browserOnboardingGateway,
}: Readonly<{
  children: ReactNode;
  initialStatus: OnboardingStatusDto;
  gateway?: OnboardingGateway;
}>) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPathState] = useState<OnboardingPathDto | null>(() => initialStatus.path);
  const [currentStep, setCurrentStep] = useState<OnboardingStepDto>(() =>
    resolveOnboardingStep(initialStatus.path, initialStatus.currentStep),
  );
  const [draft, setDraft] = useState<OnboardingDraft>(createEmptyDraft);

  const value = useMemo<OnboardingFlowValue>(
    () => ({
      saving,
      error,
      path,
      currentStep,
      draft,
      setPath(nextPath) {
        if (nextPath !== path) setDraft(createEmptyDraft());
        setPathState(nextPath);
        setError(null);
      },
      updateDraft(patch) {
        setDraft((current) => ({ ...current, ...patch }));
        setError(null);
      },
      clearGameAccount() {
        setDraft((current) => ({
          ...current,
          gameAccountIdentifier: "",
          platform: null,
          gameEdition: "",
          customGameEdition: false,
        }));
      },
      clearExternalClub() {
        setDraft((current) => ({ ...current, selectedExternalClub: null }));
      },
      async checkOrganizationName(name) {
        if (saving) return null;
        setSaving(true);
        setError(null);
        try {
          const result = await gateway.checkOrganizationName({ name });
          return result.available;
        } catch {
          setError("No pudimos verificar el nombre. Inténtalo nuevamente.");
          return null;
        } finally {
          setSaving(false);
        }
      },
      async searchExternalClubs(input) {
        return gateway.searchExternalClubs(input);
      },
      async goTo(step, requestedPath = path) {
        if (saving) return;
        setSaving(true);
        setError(null);
        try {
          await gateway.saveProgress({ path: requestedPath, currentStep: step });
          setPathState(requestedPath);
          setCurrentStep(step);
          await navigate({ to: routeForOnboardingStep(step) });
        } catch {
          setError("No pudimos guardar tu progreso. Inténtalo nuevamente.");
        } finally {
          setSaving(false);
        }
      },
      async finish() {
        if (!path || saving) return;
        setSaving(true);
        setLeaving(true);
        setError(null);
        try {
          if (path === "organization") {
            const competition = competitionFromDraft(draft);
            if (!competition) throw new Error("Incomplete competition draft");
            const created = await gateway.createOrganization({
              name: draft.organizationName.trim(),
              competition,
              gameAccount: playerAccountFromDraft(draft),
            });
            await navigate({
              to: "/orgs/$orgId/competitions/$competitionId/setup",
              params: {
                orgId: created.destination.organizationId,
                competitionId: created.destination.competitionId,
              },
              replace: true,
            });
          } else if (path === "invitation") {
            const accepted = await gateway.acceptInvitation({
              token: draft.invitationToken.trim(),
              gameAccount: playerAccountFromDraft(draft),
            });
            await navigate({
              to: "/orgs/$orgId/competitions/$competitionId",
              params: {
                orgId: accepted.destination.organizationId,
                competitionId: accepted.destination.competitionId,
              },
              replace: true,
            });
          } else {
            await gateway.completePlayer({
              gameAccount: playerAccountFromDraft(draft),
              externalClub: externalClubLocatorFromDraft(draft),
            });
            await navigate({ to: "/player", replace: true });
          }
        } catch (caught) {
          setError(finalizationError(path, caught));
          setLeaving(false);
          setSaving(false);
        }
      },
    }),
    [currentStep, draft, error, gateway, navigate, path, saving],
  );

  const expectedRoute = routeForOnboardingStep(currentStep);
  return (
    <OnboardingFlowContext value={value}>
      {!leaving && pathname !== expectedRoute ? (
        <>
          <Navigate to={expectedRoute} replace />
          <RoutePendingState message="Recuperando tu progreso…" />
        </>
      ) : (
        children
      )}
    </OnboardingFlowContext>
  );
}

export function competitionFromDraft(draft: OnboardingDraft): CompetitionDraftInputDto | null {
  const name = draft.competitionName.trim();
  const gameEdition = draft.competitionGameEdition.trim();
  const timeZone = draft.competitionTimeZone.trim();
  if (
    !name ||
    !gameEdition ||
    !draft.competitionPlatform ||
    !draft.competitionRegion ||
    !timeZone ||
    !draft.competitionFormat
  ) {
    return null;
  }
  return {
    name,
    gameEdition,
    platform: draft.competitionPlatform,
    region: draft.competitionRegion,
    timeZone,
    format: draft.competitionFormat,
  };
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function useOnboardingFlow(): OnboardingFlowValue {
  const value = useContext(OnboardingFlowContext);
  if (!value) throw new Error("useOnboardingFlow must be used within OnboardingFlowProvider");
  return value;
}

export function playerAccountFromDraft(draft: OnboardingDraft): PlayerGameAccountInputDto | null {
  const identifier = draft.gameAccountIdentifier.trim();
  const gameEdition = draft.gameEdition.trim();
  if (!identifier && !draft.platform && !gameEdition) return null;
  if (!identifier || !draft.platform || !gameEdition) return null;
  return { identifier, platform: draft.platform, gameEdition };
}

export function externalClubLocatorFromDraft(
  draft: OnboardingDraft,
): PlayerExternalClubSelectionInputDto | null {
  const selected = draft.selectedExternalClub;
  if (!selected) return null;
  return {
    providerKey: selected.providerKey,
    externalClubId: selected.externalClubId,
    platform: selected.platform,
    gameEdition: selected.gameEdition,
  };
}

function finalizationError(path: OnboardingPathDto, caught: unknown): string {
  if (caught instanceof IdentityOnboardingClientError && path === "invitation") {
    switch (caught.code) {
      case "organizations.invitation_not_found":
        return "No encontramos esa invitación. Revisa el código e inténtalo nuevamente.";
      case "organizations.invitation_expired":
        return "La invitación ha caducado. Solicita una nueva al organizador.";
      case "organizations.invitation_revoked":
        return "La invitación fue revocada. Solicita una nueva al organizador.";
      case "organizations.invitation_invalid":
        return "La invitación ya no está disponible.";
    }
  }
  if (caught instanceof IdentityOnboardingClientError && path === "organization") {
    if (caught.code === "organizations.name_conflict") {
      return "Ese nombre de organización ya está en uso. Vuelve y elige otro.";
    }
    if (caught.code.startsWith("competitions.invalid_")) {
      return "Los datos de la competición no son válidos. Revísalos e inténtalo nuevamente.";
    }
    if (caught.code.startsWith("teams.invalid_")) {
      return "Los datos de la cuenta de juego no son válidos. Revísalos e inténtalo nuevamente.";
    }
    return caught.code === "organizations.invalid_name"
      ? "El nombre de la organización no es válido."
      : "No pudimos crear la organización. Inténtalo nuevamente.";
  }
  if (caught instanceof IdentityOnboardingClientError && caught.code.startsWith("teams.invalid_")) {
    return "Los datos de la cuenta de juego no son válidos. Revísalos e inténtalo nuevamente.";
  }
  if (caught instanceof IdentityOnboardingClientError && path === "player") {
    return "No pudimos guardar tu perfil de jugador. Inténtalo nuevamente.";
  }
  return "No pudimos finalizar tu configuración. Inténtalo nuevamente.";
}
