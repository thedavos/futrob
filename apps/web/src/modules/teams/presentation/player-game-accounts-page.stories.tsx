import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { PlayerStoryState } from "./player-story-client.ts";
import {
  playerProfileFixture,
  playerTeamsFixture,
  readyPlayerProfileFixture,
} from "./player-story-fixtures.ts";
import { PlayerGameAccountsPage } from "./player-game-accounts-page.tsx";
import { PlayerStoryShell, PlayerStoryStub, type PlayerStoryRoute } from "./player-story-shell.tsx";

const SCENARIO_IDS = ["empty", "ready", "loading", "error"] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

function scenarioState(id: ScenarioId): PlayerStoryState {
  const rest = {
    teams: playerTeamsFixture({ teams: [], activeRosterMembershipId: null }),
    setActiveTeam: "success" as const,
    acceptRosterInvitation: "success" as const,
    rosterInvitations: { invitations: [] },
    respondToRosterInvitation: "success" as const,
  };
  switch (id) {
    case "empty":
      return { ...rest, profile: playerProfileFixture(), addGameAccount: "success" };
    case "ready":
      return { ...rest, profile: readyPlayerProfileFixture(), addGameAccount: "success" };
    case "loading":
      return { ...rest, profile: "pending", addGameAccount: "success" };
    case "error":
      return { ...rest, profile: "error", addGameAccount: "success" };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

const GAME_DATA_ROUTES: readonly PlayerStoryRoute[] = [
  { path: "/player/game-accounts", component: PlayerGameAccountsPage },
  {
    path: "/player",
    component: () => <PlayerStoryStub label="Espacio personal (stub de Storybook)" />,
  },
  {
    path: "/player/matches",
    component: () => <PlayerStoryStub label="Mis partidos (stub de Storybook)" />,
  },
  {
    path: "/player/statistics",
    component: () => <PlayerStoryStub label="Mis estadísticas (stub de Storybook)" />,
  },
];

function GameDataStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const state = useMemo(() => scenarioState(scenario), [scenario]);
  return (
    <PlayerStoryShell initialPath="/player/game-accounts" routes={GAME_DATA_ROUTES} state={state} />
  );
}

const meta = {
  title: "Product/Player/Game data",
  parameters: { layout: "fullscreen" },
  args: {
    scenario: "empty",
  },
  argTypes: {
    scenario: {
      control: "select",
      options: [...SCENARIO_IDS],
    },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
};

export const Empty: Story = {
  name: "Empty",
  args: { scenario: "empty" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Datos de juego" })).toBeVisible();
    await expect(
      canvas.getByText("Registra tu identificador para consultar tu actividad de EA Clubs."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Actualizar datos" })).toBeEnabled();
    await expect(
      canvas.getByRole("heading", { name: "Registra tus datos de juego" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "Selecciona tu plataforma, busca tu club de EA Clubs y registra tu identificador.",
      ),
    ).toBeVisible();
    const register = canvas.getByRole("button", { name: "Registra tu identificador" });
    await expect(register).toBeEnabled();
    await expect(canvas.getByRole("navigation", { name: "Pasos del registro" })).toBeVisible();
    await expect(canvas.getByText("Plataforma")).toBeVisible();
    await expect(canvas.getByText("Club")).toBeVisible();
    await expect(canvas.getByText("Identificador")).toBeVisible();
    await expect(canvas.queryByRole("listitem", { current: "step" })).toBeNull();
    await expect(
      canvas.getByText(
        "Los partidos y las estadísticas aparecen cuando registres tu identificador.",
      ),
    ).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Identificador del jugador" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Clubes añadidos" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Mis partidos" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Mis estadísticas" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Añadir cuenta" })).toBeNull();
  },
};

export const HappyPath: Story = {
  name: "Happy path",
  args: { scenario: "empty" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Registra tus datos de juego" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Registra tu identificador" }));
    await expect(
      canvas.queryByText(
        "Selecciona tu plataforma, busca tu club de EA Clubs y registra tu identificador.",
      ),
    ).toBeNull();
    await expect(
      canvas.getByRole("heading", { name: "Registra tus datos de juego" }),
    ).toBeVisible();
    await expect(canvas.getByRole("listitem", { current: "step" })).toHaveTextContent("Plataforma");
    await userEvent.click(canvas.getByRole("radio", { name: "PlayStation" }));
    await userEvent.click(canvas.getByRole("radio", { name: "FC 26" }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(canvas.getByRole("listitem", { current: "step" })).toHaveTextContent("Club");
    await userEvent.type(await canvas.findByRole("textbox", { name: "Nombre del club" }), "Fera");
    await userEvent.click(canvas.getByRole("button", { name: "Buscar club" }));
    await userEvent.click(await canvas.findByRole("button", { name: /Fera Enjaulada/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(canvas.getByRole("listitem", { current: "step" })).toHaveTextContent(
      "Identificador",
    );
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Identificador de EA" }),
      "davos282",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Registra tu identificador" }));
    await expect(
      await canvas.findByRole("region", { name: "Identificador del jugador" }),
    ).toBeVisible();
    await expect(canvas.getByText("davos282")).toBeVisible();
    await expect(canvas.getByText("PlayStation")).toBeVisible();
    await expect(canvas.getByText("FC 26")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Clubes añadidos" })).toBeVisible();
    await expect(canvas.getByText("Fera Enjaulada")).toBeVisible();
    await expect(canvas.getByText("Club EA · ID 22110")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Añadir otro club" })).toBeEnabled();
    await expect(canvas.getByRole("heading", { name: "Mis partidos" })).toBeVisible();
    await expect(
      canvas.getByText("Tus partidos recientes y el historial del club seleccionado."),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ver mis partidos" })).toHaveAttribute(
      "href",
      "/player/matches",
    );
    await expect(canvas.getByRole("heading", { name: "Mis estadísticas" })).toBeVisible();
    await expect(
      canvas.getByText("Tu rating, atributos y rendimiento en partidos recientes de EA Clubs."),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ver mis estadísticas" })).toHaveAttribute(
      "href",
      "/player/statistics",
    );
    await expect(canvas.queryByRole("heading", { name: "Registra tus datos de juego" })).toBeNull();
  },
};

export const LinkedAccounts: Story = {
  name: "Linked accounts",
  args: { scenario: "ready" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "Actualizar datos" })).toBeEnabled();
    await expect(canvas.getByText("davos282")).toBeVisible();
    await expect(canvas.getByText("PlayStation")).toBeVisible();
    await expect(canvas.getByText("FC 26")).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Identificador del jugador" })).toBeNull();
    await expect(canvas.getByRole("region", { name: "Identificador del jugador" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Editar identificador" })).toBeEnabled();
    await expect(canvas.getByRole("heading", { name: "Mis partidos" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ver mis partidos" })).toHaveAttribute(
      "href",
      "/player/matches",
    );
    await expect(canvas.getByRole("heading", { name: "Mis estadísticas" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ver mis estadísticas" })).toHaveAttribute(
      "href",
      "/player/statistics",
    );
    await expect(canvas.getByText("Night Owls")).toBeVisible();
    await expect(canvas.getByText("Club EA · ID 10754")).toBeVisible();
    await expect(canvasElement.querySelector("[data-slot='scroll-area']")).not.toBeNull();
    await expect(canvas.getByText("Cuervos FC1")).toBeInTheDocument();
    await expect(canvas.getByText("MADERAS FC")).toBeInTheDocument();
    await expect(canvas.getByText("Fera Barranco")).toBeInTheDocument();
    await expect(canvas.getByText("Sirius FC")).toBeInTheDocument();
    await expect(canvas.getByText("Atlas Nocturno")).toBeInTheDocument();
    await expect(canvas.getByText("Seleccionado")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Añadir otro club" })).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Cambiar club Fera Enjaulada" }));
    await expect(canvas.getByRole("button", { name: "Cambiar club Night Owls" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Cambiar club Fera Enjaulada" })).toBeNull();
    const firstClub = within(canvas.getByRole("list")).getAllByRole("listitem")[0];
    await expect(firstClub).toHaveTextContent("Fera Enjaulada");
    await expect(within(firstClub!).getByText("Seleccionado")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Añadir otro club" }));
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole("dialog", { name: "Añadir club" })).toBeVisible());
    await expect(body.getByRole("textbox", { name: "Nombre del club" })).toBeVisible();
    await userEvent.click(body.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull(), { timeout: 5_000 });
    await userEvent.click(canvas.getByRole("button", { name: "Editar identificador" }));
    const identifier = await body.findByRole("textbox", { name: "Identificador de EA" });
    await waitFor(() => expect(body.getByRole("dialog")).toBeVisible());
    await expect(identifier).toHaveValue("davos282");
    await userEvent.clear(identifier);
    await userEvent.type(identifier, "davos283");
    await userEvent.click(body.getByRole("button", { name: "Guardar cambios" }));
    await expect(await canvas.findByText("davos283")).toBeVisible();
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull(), { timeout: 5_000 });
    await expect(canvas.getByText("Night Owls")).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Registra tus datos de juego" })).toBeNull();
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { scenario: "loading" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Actualizar datos" })).toBeDisabled();
    await expect(canvas.getByRole("status", { name: "Cargando datos de juego…" })).toBeVisible();
    await expect(canvasElement.querySelector("[data-slot='skeleton']")).not.toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Registra tus datos de juego" })).toBeNull();
    await expect(canvas.queryByRole("navigation", { name: "Pasos del registro" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Identificador del jugador" })).toBeNull();
    await expect(canvas.queryByText("Todavía no registraste un identificador de EA.")).toBeNull();
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "Actualizar datos" })).toBeEnabled();
    await expect(canvas.getByText("No se pudieron cargar tus datos de juego.")).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Registra tus datos de juego" })).toBeNull();
    await expect(canvas.queryByRole("navigation", { name: "Pasos del registro" })).toBeNull();
    await expect(canvas.queryByText("Todavía no registraste un identificador de EA.")).toBeNull();
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
};

export const EmptyMobile: Story = {
  name: "Empty mobile",
  args: { scenario: "empty" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
};
