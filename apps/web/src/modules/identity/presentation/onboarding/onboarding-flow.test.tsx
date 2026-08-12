// @vitest-environment jsdom

import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { ExternalClubDto } from "@futrob/api-contracts";

import {
  OnboardingStoryRouter,
  STORY_EXTERNAL_CLUBS,
  createFakeOnboardingGateway,
} from "./onboarding-story-router.tsx";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import { GameDataClientError } from "@/modules/game-data/presentation/game-data-browser-client.ts";

beforeEach(() => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("OnboardingFlowProvider initialization", () => {
  it("renders the player path in English", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway()}
        initialPath="/onboarding/intention"
        locale="en"
      />,
    );

    fireEvent.click(await screen.findByRole("radio", { name: /Start as a player/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Set up your game details" });
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    await screen.findByRole("heading", { name: "Link your EA club" });
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));

    expect(await screen.findByRole("heading", { name: "Confirm your setup" })).toBeTruthy();
    expect(screen.getByText("No club linked yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enter my personal space" })).toBeTruthy();
  });

  it("keeps the onboarding draft when the language changes", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({ path: "player", currentStep: "game-account" })}
        initialPath="/onboarding/game-account"
      />,
    );

    const identifier = await screen.findByRole("textbox", { name: "Identificador de EA" });
    await user.type(identifier, "gamer23");
    await user.click(screen.getByRole("radio", { name: "PlayStation" }));
    await user.click(screen.getByRole("combobox", { name: "Idioma" }));
    await user.click(await screen.findByRole("option", { name: "Inglés" }));

    expect(await screen.findByRole("heading", { name: "Set up your game details" })).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "EA identifier" }) as HTMLInputElement).value).toBe(
      "gamer23",
    );
    expect(screen.getByRole("radio", { name: "PlayStation" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByText("Step 2 of 4 · Account")).toBeTruthy();
    expect(document.documentElement.lang).toBe("en");
  });

  it("pluralizes English club results without translating provider data", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "player",
          currentStep: "club",
          clubs: STORY_EXTERNAL_CLUBS.slice(0, 2),
        })}
        initialPath="/onboarding/club"
        locale="en"
      />,
    );

    fireEvent.change(await screen.findByRole("textbox", { name: "Club name" }), {
      target: { value: "Fera" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search clubs" }));

    expect(await screen.findByText("2 clubs found.")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Fera Enjaulada/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Fera Night Owls/ })).toBeTruthy();
  });

  it("renders a legacy actor from route data under StrictMode", async () => {
    const gateway = createFakeOnboardingGateway({
      path: null,
      currentStep: "intention",
    });

    render(
      <StrictMode>
        <OnboardingStoryRouter gateway={gateway} initialPath="/onboarding/intention" />
      </StrictMode>,
    );

    expect(
      await screen.findByRole("heading", { name: "¿Qué quieres hacer primero?" }),
    ).toBeTruthy();
    expect(screen.queryByText("Recuperando tu progreso…")).toBeNull();
  });

  it("cold-bootstraps at intention when the server has an advanced step without draft", async () => {
    const gateway = createFakeOnboardingGateway({
      path: "player",
      currentStep: "game-account",
    });

    render(
      <StrictMode>
        <OnboardingStoryRouter
          bootstrap="cold"
          gateway={gateway}
          initialPath="/onboarding/intention"
        />
      </StrictMode>,
    );

    expect(
      await screen.findByRole("heading", { name: "¿Qué quieres hacer primero?" }),
    ).toBeTruthy();
  });

  it("edits a completed review row from its relevant step", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway()}
        initialPath="/onboarding/intention"
      />,
    );

    fireEvent.click(await screen.findByRole("radio", { name: /Empezar como jugador/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Configura tus datos de juego" });
    const account = await screen.findByRole("textbox", { name: "Identificador de EA" });
    fireEvent.change(account, { target: { value: "gamer23" } });
    fireEvent.click(screen.getByRole("radio", { name: "FC 26" }));
    fireEvent.click(screen.getByRole("radio", { name: "Nintendo Switch 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Asocia tu club EA" });
    const platformTrigger = screen.getByRole("combobox", {
      name: "Plataforma EA para la búsqueda",
    });
    expect(
      platformTrigger.querySelector("[data-platform-logo]")?.getAttribute("data-platform-logo"),
    ).toBe("nintendo-switch-2");
    fireEvent.click(screen.getByRole("button", { name: "Omitir por ahora" }));
    await screen.findByRole("heading", { name: "Confirma tu configuración" });
    fireEvent.click(screen.getByRole("button", { name: "Editar cuenta de juego" }));

    expect(
      await screen.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeTruthy();
  });

  it("redirects an empty advanced review resume back to intention", async () => {
    render(
      <OnboardingStoryRouter
        bootstrap="cold"
        gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "review" })}
        initialPath="/onboarding/review"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "¿Qué quieres hacer primero?" }),
    ).toBeTruthy();
  });

  it("redirects the legacy team route to the club step without a loop", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({ path: "player", currentStep: "club" })}
        initialPath="/onboarding/team"
      />,
    );

    expect(await screen.findByRole("heading", { name: "Asocia tu club EA" })).toBeTruthy();
    expect(
      screen.getByText(
        "La asociación es opcional y declarativa. No verifica propiedad, ni crea un Team de competición ni te incorpora a una plantilla.",
      ),
    ).toBeTruthy();
  });

  it("navigates optimistically before saveProgress resolves", async () => {
    let resolveSave: ((value: unknown) => void) | undefined;
    const gateway = createFakeOnboardingGateway({
      path: null,
      currentStep: "intention",
    });
    const originalSave = gateway.saveProgress.bind(gateway);
    gateway.saveProgress = async (input) => {
      await new Promise((resolve) => {
        resolveSave = resolve;
      });
      return originalSave(input);
    };

    render(<OnboardingStoryRouter gateway={gateway} initialPath="/onboarding/intention" />);

    fireEvent.click(await screen.findByRole("radio", { name: /Empezar como jugador/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      await screen.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeTruthy();
    resolveSave?.(undefined);
  });

  it("rolls back navigation when saveProgress fails", async () => {
    const requestId = "715f6cc1-ce62-4adf-a3f1-e8bc12fa0e68";
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          saveError: new IdentityOnboardingClientError(
            502,
            "identity.onboarding_request_failed",
            requestId,
          ),
        })}
        initialPath="/onboarding/intention"
      />,
    );

    fireEvent.click(await screen.findByRole("radio", { name: /Empezar como jugador/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      await screen.findByText("No pudimos guardar tu progreso. Inténtalo nuevamente."),
    ).toBeTruthy();
    expect(screen.getByText(requestId)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copiar código de soporte" })).toBeTruthy();
    expect(
      await screen.findByRole("heading", { name: "¿Qué quieres hacer primero?" }),
    ).toBeTruthy();
  });

  it("shows a support code when organization name verification fails", async () => {
    const requestId = "2d81f9de-55a8-4f4b-9962-86f63145def0";
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "organization",
          currentStep: "organization",
          checkNameError: new IdentityOnboardingClientError(
            502,
            "identity.onboarding_request_failed",
            requestId,
          ),
        })}
        initialPath="/onboarding/organization"
      />,
    );

    const input = await screen.findByRole("textbox", { name: "Nombre de la organización" });
    fireEvent.change(input, { target: { value: "Liga Norte" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar organización" }));

    expect(
      await screen.findByText("No pudimos verificar el nombre. Inténtalo nuevamente."),
    ).toBeTruthy();
    expect(screen.getByText(requestId)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copiar código de soporte" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Crea tu organización" })).toBeTruthy();
  });

  it("retranslates a visible save error when the locale changes", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({ failSave: true })}
        initialPath="/onboarding/intention"
      />,
    );

    await user.click(await screen.findByRole("radio", { name: /Empezar como jugador/ }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(
      await screen.findByText("No pudimos guardar tu progreso. Inténtalo nuevamente."),
    ).toBeTruthy();

    await user.click(screen.getByRole("combobox", { name: "Idioma" }));
    await user.click(await screen.findByRole("option", { name: "Inglés" }));

    expect(await screen.findByText("We couldn't save your progress. Try again.")).toBeTruthy();
  });

  it("does not bounce a finished player back to intention when the provider stays mounted", async () => {
    const completePlayer = vi.fn<() => Promise<void>>(async () => undefined);
    const gateway = createFakeOnboardingGateway({ path: "player", currentStep: "review" });
    gateway.completePlayer = completePlayer;

    render(
      <OnboardingStoryRouter
        bootstrap="cold"
        gateway={gateway}
        initialPath="/onboarding/intention"
      />,
    );

    fireEvent.click(await screen.findByRole("radio", { name: /Empezar como jugador/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Configura tus datos de juego" });
    fireEvent.click(screen.getByRole("button", { name: "Omitir por ahora" }));
    await screen.findByRole("heading", { name: "Asocia tu club EA" });
    fireEvent.click(screen.getByRole("button", { name: "Omitir por ahora" }));
    await screen.findByRole("heading", { name: "Confirma tu configuración" });

    fireEvent.click(screen.getByRole("button", { name: "Entrar a mi espacio" }));

    expect(await screen.findByRole("heading", { name: "Espacio personal" })).toBeTruthy();
    expect(completePlayer).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "¿Qué quieres hacer primero?" })).toBeNull();
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
  ] as const)("shows typed invitation finish error for %s", async (code, message) => {
    const user = userEvent.setup();
    const requestId = "2170e2f6-a47e-4338-83c3-27c054630800";
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          completeError: new IdentityOnboardingClientError(400, code, requestId),
        })}
        initialPath="/onboarding/intention"
      />,
    );

    fireEvent.click(await screen.findByRole("radio", { name: /Unirme/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Únete a una competición" });
    await user.type(screen.getByLabelText("Código de invitación"), "invite-token");
    fireEvent.click(screen.getByRole("button", { name: "Revisar invitación" }));
    await screen.findByRole("heading", { name: "Configura tus datos de juego" });
    fireEvent.click(screen.getByRole("button", { name: "Omitir por ahora" }));
    await screen.findByRole("heading", { name: "Confirma tu configuración" });

    fireEvent.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText(requestId)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copiar código de soporte" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Confirma tu configuración" })).toBeTruthy();
  });

  it("keeps invitation input and unlocks finish after a rate-limit wait", async () => {
    const gateway = createFakeOnboardingGateway({
      completeError: new IdentityOnboardingClientError(
        429,
        "api.rate_limited",
        "2170e2f6-a47e-4338-83c3-27c054630800",
        2,
      ),
    });
    render(<OnboardingStoryRouter gateway={gateway} initialPath="/onboarding/intention" />);

    fireEvent.click(await screen.findByRole("radio", { name: /Unirme/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Únete a una competición" });
    fireEvent.change(screen.getByLabelText("Código de invitación"), {
      target: { value: "invite-token" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Revisar invitación" }));
    await screen.findByRole("heading", { name: "Configura tus datos de juego" });
    fireEvent.click(screen.getByRole("button", { name: "Omitir por ahora" }));
    await screen.findByRole("heading", { name: "Confirma tu configuración" });

    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Aceptar invitación" }));
      await act(async () => Promise.resolve());

      expect(screen.getByText("Podrás reintentar en 2 s.")).toBeTruthy();
      expect(
        (screen.getByRole("button", { name: "Reintentar en 2 s" }) as HTMLButtonElement).disabled,
      ).toBe(true);

      void act(() => vi.advanceTimersByTime(2_000));
      expect(
        (screen.getByRole("button", { name: "Aceptar invitación" }) as HTMLButtonElement).disabled,
      ).toBe(false);
    } finally {
      vi.useRealTimers();
    }

    fireEvent.click(screen.getByRole("button", { name: "Editar competición" }));
    expect(((await screen.findByLabelText("Código de invitación")) as HTMLInputElement).value).toBe(
      "invite-token",
    );
  });

  it("turns an omitted invitation into the player path", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway()}
        initialPath="/onboarding/intention"
      />,
    );
    fireEvent.click(await screen.findByRole("radio", { name: /Unirme/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Únete a una competición" });
    fireEvent.click(screen.getByRole("button", { name: "Continuar como jugador" }));
    await screen.findByRole("heading", { name: "Configura tus datos de juego" });
    fireEvent.click(screen.getByRole("button", { name: "Omitir por ahora" }));
    await screen.findByRole("heading", { name: "Asocia tu club EA" });
    fireEvent.click(screen.getByRole("button", { name: "Omitir por ahora" }));
    await screen.findByRole("heading", { name: "Confirma tu configuración" });

    const startingPath = screen.getByText("Cómo empezarás");
    expect(startingPath.parentElement?.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Empezar como jugador")).toBeTruthy();
    expect(screen.getByText("Sin club asociado por ahora")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Entrar a mi espacio" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("searches and selects an EA club on the player club step", async () => {
    const searches: Array<{ gameEdition?: string }> = [];
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "player",
          currentStep: "club",
          onSearchExternalClubs: (request) => searches.push(request),
        })}
        initialPath="/onboarding/club"
      />,
    );

    const query = await screen.findByRole("textbox", { name: "Nombre del club" });
    fireEvent.change(query, { target: { value: "Fera" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar club" }));

    const club = await screen.findByRole("radio", { name: /Fera Enjaulada/ });
    fireEvent.click(club);
    expect(searches.at(-1)?.gameEdition).toBe("fc26");
    expect(club.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Revisar club" }));

    await screen.findByRole("heading", { name: "Confirma tu configuración" });
    expect(screen.getByText(/Fera Enjaulada/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar club ea" }));
    expect(await screen.findByRole("heading", { name: "Asocia tu club EA" })).toBeTruthy();
  });

  it("preserves the club query and enables retry after a rate-limit wait", async () => {
    const gateway = createFakeOnboardingGateway({ path: "player", currentStep: "club" });
    gateway.searchExternalClubs = async () => {
      throw new GameDataClientError({
        code: "api.rate_limited",
        message: "api.rate_limited",
        requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
        retryAfterSeconds: 2,
        status: 429,
      });
    };
    render(<OnboardingStoryRouter gateway={gateway} initialPath="/onboarding/club" />);

    const query = await screen.findByRole("textbox", { name: "Nombre del club" });
    fireEvent.change(query, { target: { value: "Fera" } });
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Buscar club" }));
      await act(async () => Promise.resolve());

      expect((query as HTMLInputElement).value).toBe("Fera");
      expect(screen.getByText("Podrás reintentar en 2 s.")).toBeTruthy();
      expect(
        (screen.getByRole("button", { name: "Reintentar en 2 s" }) as HTMLButtonElement).disabled,
      ).toBe(true);

      void act(() => vi.advanceTimersByTime(2_000));
      expect(
        (screen.getByRole("button", { name: "Buscar club" }) as HTMLButtonElement).disabled,
      ).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("searches clubs with the draft game edition and clears selection when the platform changes", async () => {
    const user = userEvent.setup();
    const searches: Array<{ gameEdition?: string; platform?: string }> = [];
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "player",
          currentStep: "game-account",
          onSearchExternalClubs: (request) => searches.push(request),
        })}
        initialPath="/onboarding/game-account"
      />,
    );

    const account = await screen.findByRole("textbox", { name: "Identificador de EA" });
    await user.type(account, "gamer23");
    await user.click(screen.getByRole("radio", { name: "FC 25" }));
    await user.click(screen.getByRole("radio", { name: "PlayStation" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByRole("heading", { name: "Asocia tu club EA" });
    await user.type(screen.getByRole("textbox", { name: "Nombre del club" }), "Fera");
    await user.click(screen.getByRole("button", { name: "Buscar club" }));

    const club = await screen.findByRole("radio", { name: /Fera Enjaulada/ });
    await user.click(club);
    expect(searches.at(-1)?.gameEdition).toBe("fc25");
    expect(
      (screen.getByRole("button", { name: "Revisar club" }) as HTMLButtonElement).disabled,
    ).toBe(false);

    await user.click(screen.getByRole("combobox", { name: "Plataforma EA para la búsqueda" }));
    await user.click(await screen.findByRole("option", { name: /Xbox/ }));

    await waitFor(() => {
      expect(screen.queryByRole("radio", { name: /Fera Enjaulada/ })).toBeNull();
    });
    expect(
      (screen.getByRole("button", { name: "Revisar club" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("discards a pending club search when the platform changes", async () => {
    const user = userEvent.setup();
    const gateway = createFakeOnboardingGateway({ path: "player", currentStep: "club" });
    let resolveSearch: ((clubs: readonly ExternalClubDto[]) => void) | undefined;
    gateway.searchExternalClubs = async () =>
      await new Promise<readonly ExternalClubDto[]>((resolve) => {
        resolveSearch = resolve;
      });
    render(<OnboardingStoryRouter gateway={gateway} initialPath="/onboarding/club" />);

    await user.type(await screen.findByRole("textbox", { name: "Nombre del club" }), "Fera");
    await user.click(screen.getByRole("button", { name: "Buscar club" }));
    await screen.findByText("Buscando clubs para «Fera»…");
    await user.click(screen.getByRole("combobox", { name: "Plataforma EA para la búsqueda" }));
    await user.click(await screen.findByRole("option", { name: "Xbox" }));

    await act(async () => {
      resolveSearch?.([...STORY_EXTERNAL_CLUBS]);
    });

    expect(screen.queryByRole("radio", { name: /Fera Enjaulada/ })).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Revisar club" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("shows a recoverable error when club search fails", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "player",
          currentStep: "club",
          searchError: true,
        })}
        initialPath="/onboarding/club"
      />,
    );

    fireEvent.change(await screen.findByRole("textbox", { name: "Nombre del club" }), {
      target: { value: "Fera" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar club" }));

    expect(await screen.findByText("No pudimos buscar clubs. Inténtalo nuevamente.")).toBeTruthy();
  });

  it("does not advance while the organization name is already in use", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "organization",
          currentStep: "organization",
          organizationNameAvailable: false,
        })}
        initialPath="/onboarding/organization"
      />,
    );

    const input = await screen.findByRole("textbox", { name: "Nombre de la organización" });
    fireEvent.change(input, { target: { value: "Liga Norte" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar organización" }));

    expect(await screen.findByText("Ese nombre ya está en uso. Elige otro.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Crea tu organización" })).toBeTruthy();
    expect(document.activeElement).toBe(input);
  });

  it("focuses the first missing game-account field", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({ path: "player", currentStep: "game-account" })}
        initialPath="/onboarding/game-account"
      />,
    );
    const identifier = await screen.findByRole("textbox", { name: "Identificador de EA" });
    fireEvent.click(screen.getByRole("button", { name: "Vincular y continuar" }));

    const error = screen.getByText("Escribe tu identificador de EA.");
    expect(error).toBeTruthy();
    expect(identifier.getAttribute("aria-describedby")).toBe(error.parentElement?.id);
    expect(document.activeElement).toBe(identifier);
  });

  it("renders a recognizable logo for every game platform", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({ path: "player", currentStep: "game-account" })}
        initialPath="/onboarding/game-account"
      />,
    );

    const platforms = [
      ["PlayStation", "playstation"],
      ["Xbox", "xbox"],
      ["PC", "pc"],
      ["Nintendo Switch 1", "nintendo-switch-1"],
      ["Nintendo Switch 2", "nintendo-switch-2"],
    ] as const;

    for (const [label, value] of platforms) {
      const option = await screen.findByRole("radio", { name: label });
      expect(option.querySelector(`[data-platform-logo="${value}"]`)).toBeTruthy();
    }
  });

  it("places the fixed modality in the competition introduction and labels America", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "organization",
          currentStep: "competition",
        })}
        initialPath="/onboarding/competition"
      />,
    );

    expect(
      await screen.findByText(
        "Crea un borrador de FC Clubs. Configurarás los equipos, el calendario y la publicación después.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Modalidad: FC Clubs/)).toBeNull();

    const region = screen.getByRole("combobox", { name: "Región deportiva" });
    fireEvent.click(region);
    const america = await screen.findByRole("option", { name: "América" });
    fireEvent.pointerDown(america, { pointerType: "mouse" });
    fireEvent.click(america);
    expect(region.textContent).toContain("América");
    expect(region.textContent).not.toContain("america");
  });

  it("shows the human label for the selected competition format", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "organization",
          currentStep: "competition",
        })}
        initialPath="/onboarding/competition"
      />,
    );

    const format = await screen.findByRole("combobox", { name: "Formato inicial" });
    fireEvent.click(format);
    const knockout = await screen.findByRole("option", { name: "Eliminación directa" });
    fireEvent.pointerDown(knockout, { pointerType: "mouse" });
    fireEvent.click(knockout);
    expect(format.textContent).toContain("Eliminación directa");
    expect(format.textContent).not.toContain("knockout");
  });

  it("uses a selector for the competition time zone", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "organization",
          currentStep: "competition",
        })}
        initialPath="/onboarding/competition"
      />,
    );

    const timeZone = await screen.findByRole("combobox", { name: "Zona horaria" });
    fireEvent.click(timeZone);
    const lima = await screen.findByRole("option", { name: "America/Lima" });
    fireEvent.pointerDown(lima, { pointerType: "mouse" });
    fireEvent.click(lima);
    expect(timeZone.textContent).toContain("America/Lima");
  });

  it("offers competition data as an aligned optional account action", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "organization",
          currentStep: "competition",
        })}
        initialPath="/onboarding/competition"
      />,
    );

    fireEvent.change(await screen.findByRole("textbox", { name: "Nombre de la competición" }), {
      target: { value: "Liga Futrob" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "FC 26" }));
    fireEvent.click(screen.getByRole("radio", { name: "PlayStation" }));

    const region = screen.getByRole("combobox", { name: "Región deportiva" });
    fireEvent.click(region);
    const america = await screen.findByRole("option", { name: "América" });
    fireEvent.pointerDown(america, { pointerType: "mouse" });
    fireEvent.click(america);

    const format = screen.getByRole("combobox", { name: "Formato inicial" });
    fireEvent.click(format);
    const league = await screen.findByRole("option", { name: "Liga" });
    fireEvent.pointerDown(league, { pointerType: "mouse" });
    fireEvent.click(league);

    fireEvent.click(screen.getByRole("button", { name: "Configurar cuenta" }));
    await screen.findByRole("heading", { name: "Configura tus datos de juego" });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(
      "La cuenta es personal, pero puedes usar la misma edición y plataforma de la competición.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Usar datos de la competición" }));
    expect(screen.getByRole("radio", { name: "PlayStation" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("radio", { name: "FC 26" }).getAttribute("aria-checked")).toBe("true");
  });

  it("navigates while saveProgress is still pending", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({ pendingSave: true })}
        initialPath="/onboarding/intention"
      />,
    );
    fireEvent.click(await screen.findByRole("radio", { name: /Organizar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("heading", { name: "Crea tu organización" })).toBeTruthy();
    expect(screen.queryByText("Guardando…")).toBeNull();
  });
});
