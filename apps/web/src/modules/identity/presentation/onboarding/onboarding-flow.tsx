"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import type {
  OnboardingPathDto,
  OnboardingStatusDto,
  OnboardingStepDto,
  PostAuthDestinationDto,
} from "@futrob/api-contracts";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";
import { organizationsBrowserClient } from "@/modules/organizations/presentation/organizations-browser-client.ts";
import { RoutePendingState } from "@/shared/presentation/route-load-state.tsx";
import { resolveOnboardingStep, routeForOnboardingStep } from "./onboarding-routing.ts";

export interface OnboardingDraft {
  readonly gameEdition: string | null;
  readonly platform: string | null;
  readonly invitationToken: string;
  readonly gameAccountIdentifier: string;
}

export interface OnboardingGateway {
  saveProgress: typeof identityBrowserClient.saveOnboardingProgress;
  complete: typeof identityBrowserClient.completeOnboarding;
  resolveDestination(): Promise<PostAuthDestinationDto>;
}

export const browserOnboardingGateway: OnboardingGateway = {
  saveProgress: (input) => identityBrowserClient.saveOnboardingProgress(input),
  complete: (input) => identityBrowserClient.completeOnboarding(input),
  async resolveDestination() {
    return (await organizationsBrowserClient.resolvePostAuthDestination()).destination;
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
  const [draft, setDraft] = useState<OnboardingDraft>({
    gameEdition: null,
    platform: null,
    invitationToken: "",
    gameAccountIdentifier: "",
  });

  const value = useMemo<OnboardingFlowValue>(
    () => ({
      saving,
      error,
      path,
      currentStep,
      draft,
      setPath(nextPath) {
        setPathState(nextPath);
        setError(null);
      },
      updateDraft(patch) {
        setDraft((current) => ({ ...current, ...patch }));
      },
      async goTo(step, requestedPath = path) {
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
        if (!path) return;
        setSaving(true);
        setLeaving(true);
        setError(null);
        try {
          await gateway.complete({ path });
          await navigateToDestination(await gateway.resolveDestination(), navigate);
        } catch {
          setError("No pudimos finalizar tu configuración. Inténtalo nuevamente.");
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

export function useOnboardingFlow(): OnboardingFlowValue {
  const value = useContext(OnboardingFlowContext);
  if (!value) throw new Error("useOnboardingFlow must be used within OnboardingFlowProvider");
  return value;
}

async function navigateToDestination(
  destination: PostAuthDestinationDto,
  navigate: ReturnType<typeof useNavigate>,
) {
  switch (destination.kind) {
    case "organization":
      await navigate({
        to: "/orgs/$orgId",
        params: { orgId: destination.organizationId },
        replace: true,
      });
      break;
    case "organizationPicker":
      await navigate({ to: "/orgs", replace: true });
      break;
    case "personal":
      await navigate({ to: "/player", replace: true });
      break;
    case "onboarding":
      await navigate({ to: "/onboarding/intention", replace: true });
  }
}
