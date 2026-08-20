// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { InspectCompetitionInvitationResponse } from "@futrob/api-contracts";

import { OnboardingStoryRouter, createFakeOnboardingGateway } from "./onboarding-story-router.tsx";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";

beforeEach(() => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("onboarding invitation preview", () => {
  it("previews an invitation before advancing and shows its sanitized context on review", async () => {
    const inspect = vi.fn<() => Promise<InspectCompetitionInvitationResponse>>(async () => ({
      organizationId: "org-preview",
      organizationName: "Liga Preview",
      competitionId: "competition-preview",
      competitionName: "Copa Preview",
      competitionRole: "player" as const,
      expiresAt: "2026-09-01T12:00:00.000Z",
    }));
    const gateway = Object.assign(createFakeOnboardingGateway(), {
      inspectCompetitionInvitation: inspect,
    });
    render(<OnboardingStoryRouter gateway={gateway} initialPath="/onboarding/intention" />);

    fireEvent.click(await screen.findByRole("radio", { name: /Unirme/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Únete a una competición" });
    fireEvent.change(screen.getByLabelText("Código de invitación"), {
      target: { value: " preview-token " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Revisar invitación" }));

    await waitFor(() => expect(inspect).toHaveBeenCalledWith({ token: "preview-token" }));
    await screen.findByRole("heading", { name: "Configura tus datos de juego" });
    fireEvent.click(screen.getByRole("button", { name: "Omitir por ahora" }));
    await screen.findByRole("heading", { name: "Confirma tu configuración" });
    expect(screen.getByText("Liga Preview")).toBeTruthy();
    expect(screen.getByText("Copa Preview")).toBeTruthy();
    expect(screen.getByText("Jugador")).toBeTruthy();
    expect(screen.queryByText("Invitación lista para validar")).toBeNull();
  });

  it("presents invitation preview metadata in English", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({ path: "invitation", currentStep: "invitation" })}
        initialPath="/onboarding/invitation"
        locale="en"
      />,
    );

    fireEvent.change(await screen.findByLabelText("Invitation code"), {
      target: { value: "invite-token" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review invitation" }));
    await screen.findByRole("heading", { name: "Set up your game details" });
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));

    await screen.findByRole("heading", { name: "Confirm your setup" });
    expect(screen.getByText("Competition role")).toBeTruthy();
    expect(screen.getByText("Player")).toBeTruthy();
    expect(screen.getByText("Valid until")).toBeTruthy();
  });

  it.each([
    [
      "organizations.invitation_not_found",
      "No encontramos esa invitación. Revisa el código e inténtalo nuevamente.",
    ],
    [
      "organizations.invitation_expired",
      "La invitación ha caducado. Solicita una nueva al organizador.",
    ],
    [
      "organizations.invitation_revoked",
      "La invitación fue revocada. Solicita una nueva al organizador.",
    ],
    ["organizations.invitation_invalid", "La invitación ya no está disponible."],
    ["organizations.invitation_exhausted", "La invitación alcanzó el número máximo de usos."],
  ] as const)("keeps the user on the code field when preview returns %s", async (code, message) => {
    const requestId = "2170e2f6-a47e-4338-83c3-27c054630801";
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "invitation",
          currentStep: "invitation",
          inspectError: new IdentityOnboardingClientError(400, code, requestId),
        })}
        initialPath="/onboarding/invitation"
      />,
    );

    const input = await screen.findByLabelText("Código de invitación");
    fireEvent.change(input, { target: { value: "invite-token" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar invitación" }));

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText(requestId)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Únete a una competición" })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("ignores a stale preview failure after the invitation code changes", async () => {
    let rejectInspection!: (reason: Error) => void;
    const inspect = vi.fn<() => Promise<never>>(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectInspection = reject;
        }),
    );
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "invitation",
          currentStep: "invitation",
          inspectInvitation: inspect,
        })}
        initialPath="/onboarding/invitation"
      />,
    );

    const input = await screen.findByLabelText("Código de invitación");
    fireEvent.change(input, { target: { value: "old-token" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar invitación" }));
    await waitFor(() => expect(inspect).toHaveBeenCalledWith({ token: "old-token" }));
    expect(screen.getByRole("button", { name: "Revisar invitación" })).toBeDisabled();

    fireEvent.change(input, { target: { value: "new-token" } });
    await act(async () => {
      rejectInspection(
        new IdentityOnboardingClientError(
          400,
          "organizations.invitation_expired",
          "2170e2f6-a47e-4338-83c3-27c054630802",
        ),
      );
    });

    expect(input).toHaveValue("new-token");
    expect(screen.queryByText(/invitación ha caducado/i)).toBeNull();
    expect(screen.getByRole("heading", { name: "Únete a una competición" })).toBeTruthy();
  });

  it("coalesces double clicks while an invitation preview is pending", async () => {
    const inspect = vi.fn<() => Promise<never>>(() => new Promise(() => undefined));
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "invitation",
          currentStep: "invitation",
          inspectInvitation: inspect,
        })}
        initialPath="/onboarding/invitation"
      />,
    );

    fireEvent.change(await screen.findByLabelText("Código de invitación"), {
      target: { value: "invite-token" },
    });
    const review = screen.getByRole("button", { name: "Revisar invitación" });
    fireEvent.click(review);
    fireEvent.click(review);

    await waitFor(() => expect(inspect).toHaveBeenCalledTimes(1));
    expect(review).toBeDisabled();
  });

  it("preserves the invitation code and unlocks preview after a rate-limit wait", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "invitation",
          currentStep: "invitation",
          inspectError: new IdentityOnboardingClientError(
            429,
            "api.rate_limited",
            "2170e2f6-a47e-4338-83c3-27c054630803",
            2,
          ),
        })}
        initialPath="/onboarding/invitation"
      />,
    );
    const input = await screen.findByLabelText("Código de invitación");
    fireEvent.change(input, { target: { value: "invite-token" } });

    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Revisar invitación" }));
      await act(async () => Promise.resolve());

      expect(screen.getByText("Podrás reintentar en 2 s.")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Reintentar en 2 s" })).toBeDisabled();
      expect(input).toHaveValue("invite-token");

      await act(async () => vi.advanceTimersByTime(2_000));
      expect(screen.getByRole("button", { name: "Revisar invitación" })).not.toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });
});
