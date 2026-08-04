// @vitest-environment jsdom

import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { OnboardingStoryRouter, createFakeOnboardingGateway } from "./onboarding-story-router.tsx";

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

  it("resumes the persisted screen from a new router entry", async () => {
    const gateway = createFakeOnboardingGateway({
      path: "player",
      currentStep: "game-account",
    });

    render(
      <StrictMode>
        <OnboardingStoryRouter gateway={gateway} initialPath="/onboarding/intention" />
      </StrictMode>,
    );

    expect(
      await screen.findByRole("heading", { name: "Configura tus datos de juego" }),
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
    fireEvent.click(screen.getByRole("button", { name: "Omitir por ahora" }));
    await screen.findByRole("heading", { name: "Confirma tu configuración" });
    fireEvent.click(screen.getByRole("button", { name: "Editar cuenta de juego" }));

    expect(
      await screen.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeTruthy();
  });

  it("restores an organization review without its draft and requires editing", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "review" })}
        initialPath="/onboarding/review"
      />,
    );

    expect((await screen.findAllByText("Pendiente")).length).toBeGreaterThan(0);
    expect(
      (
        screen.getByRole("button", {
          name: "Crear organización y competición",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Editar organización" })).toBeTruthy();
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
    expect(startingPath.parentElement?.querySelector("svg")?.getAttribute("class")).toContain(
      "lucide-signpost",
    );
    expect(screen.getByText("Empezar como jugador")).toBeTruthy();
    expect(screen.getByText("Sin club asociado por ahora")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Entrar a mi espacio" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("searches and selects an EA club on the player team step", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({ path: "player", currentStep: "team" })}
        initialPath="/onboarding/team"
      />,
    );

    const query = await screen.findByRole("textbox", { name: "Nombre del club" });
    fireEvent.change(query, { target: { value: "Fera" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar club" }));

    const club = await screen.findByRole("radio", { name: /Fera Enjaulada/ });
    fireEvent.click(club);
    expect(screen.getByText("Seleccionado")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Revisar club" }));

    await screen.findByRole("heading", { name: "Confirma tu configuración" });
    expect(screen.getByText(/Fera Enjaulada/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar club ea" }));
    expect(await screen.findByRole("heading", { name: "Asocia tu club EA" })).toBeTruthy();
  });

  it("shows a recoverable error when club search fails", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({
          path: "player",
          currentStep: "team",
          searchError: true,
        })}
        initialPath="/onboarding/team"
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

  it("keeps the action label while progress is being saved", async () => {
    render(
      <OnboardingStoryRouter
        gateway={createFakeOnboardingGateway({ pendingSave: true })}
        initialPath="/onboarding/intention"
      />,
    );
    fireEvent.click(await screen.findByRole("radio", { name: /Organizar/ }));
    const action = screen.getByRole("button", { name: "Continuar" });
    fireEvent.click(action);

    expect(action.getAttribute("aria-busy")).toBe("true");
    expect((action as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Guardando…")).toBeNull();
  });
});
