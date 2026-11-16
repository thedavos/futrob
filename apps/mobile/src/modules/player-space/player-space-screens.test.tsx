import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  ExploreCompetitionDto,
  ListAccessibleCompetitionsResponse,
} from "@futrob/api-contracts";
import * as SecureStore from "expo-secure-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { clearSession, getSession, saveSession } from "@/modules/identity/session-store";
import {
  gameProfile,
  lastMatch,
  profile,
  snapshot,
} from "@/modules/player-home/player-home.fixtures";
import { currentLocation } from "../../../test/expo-router";
import { apiError, installFakeApi } from "../../../test/fake-api";
import { cleanupApp, renderApp } from "../../../test/render-app";

const competitions = (() => {
  const source = snapshot().competitions;
  if (source.kind !== "ready") throw new Error("Fixture competitions must be ready");
  return source.data;
})() satisfies ListAccessibleCompetitionsResponse;

const liga = competitions.competitions[0]!.competition;

const explored: ExploreCompetitionDto = {
  competition: { ...liga, id: "competition-copa", name: "Copa Norte", status: "registration" },
  organization: { id: "org-2", name: "Liga Sur" },
  approvedTeamCount: 3,
};

const ownLine = (() => {
  if (lastMatch.kind !== "played") throw new Error("Fixture match must be played");
  return lastMatch.appearance;
})();

const rivalLine = {
  ...ownLine,
  externalPlayerId: "rival-9",
  displayName: "rival9",
  externalClubId: "club-maderas",
  isMvp: false,
  rating: 6.1,
};

const json = (data: unknown) => () => Response.json(data);

function playerApi() {
  return installFakeApi({
    "/identity/onboarding": json({
      completed: true,
      completedAt: "2026-09-01T00:00:00.000Z",
      version: 1,
      path: "player",
      currentStep: null,
    }),
    "/identity/account/deletion": json({ deletion: { status: "active" }, blockers: [] }),
    "/organizations/post-auth-destination": json({
      destination: { kind: "personal" },
      memberships: [],
    }),
    "/organizations/mine": json({ memberships: [] }),
    "/authorization/effective-access": json({
      actorId: "actor-1",
      scope: {},
      roles: [],
      permissions: [],
    }),
    "/players/me": json(profile),
    "/players/me/recent-matches": json({ status: "ready", matches: [lastMatch] }),
    "/players/me/recent-matches/ea-clubs/ea-1": json({
      status: "ready",
      match: {
        ...lastMatch,
        match: { ...lastMatch.match, players: [ownLine, rivalLine] },
      },
    }),
    "/players/me/game-profile": json({ status: "ready", profile: gameProfile }),
    "/competitions/mine": json(competitions),
    "/competitions/explore": json({ items: [explored], total: 1, nextCursor: null }),
    "/competitions/explore/competition-copa": json(explored),
  });
}

beforeEach(async () => {
  await saveSession({
    token: "session-token",
    user: { id: "actor-1", name: "Davos", email: "davos@example.com" },
  });
});

afterEach(async () => {
  cleanupApp();
  await clearSession();
  await SecureStore.deleteItemAsync("futrob.mobile.language");
  vi.unstubAllGlobals();
});

describe("Mis partidos", () => {
  it("lists the club's matches from its side and opens the match detail", async () => {
    const api = playerApi();
    const user = userEvent.setup();
    renderApp("/player/matches");

    expect(await screen.findByRole("heading", { name: "Mis partidos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Partidos" })).toHaveAttribute("aria-selected", "true");
    const row = await screen.findByRole("button", { name: /^vs MADERAS FC/ });
    expect(row).toHaveTextContent("Victoria 6–0");
    expect(api.requests.some((request) => request.path === "/players/me/recent-matches")).toBe(
      true,
    );

    await user.click(row);

    expect(currentLocation()?.pathname).toBe("/player/matches/ea-clubs/ea-1");
    expect(await screen.findByText("Tu partido · MVP")).toBeInTheDocument();
    expect(screen.getByLabelText("Asistencias: 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Paradas: —")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Jugadores" }));
    expect(screen.getByText("rival9")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(currentLocation()?.pathname).toBe("/player/matches");
  });

  it("says when a match type has none and returns to every match", async () => {
    playerApi();
    const user = userEvent.setup();
    renderApp("/player/matches");

    await screen.findByRole("button", { name: /^vs MADERAS FC/ });
    await user.click(screen.getByRole("tab", { name: "Amistosos" }));

    expect(await screen.findByText("No hay amistosos")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^vs MADERAS FC/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Ver todos" }));
    expect(await screen.findByRole("button", { name: /^vs MADERAS FC/ })).toBeInTheDocument();
  });

  it("asks for a club when none is associated and links to Clubes EA", async () => {
    const api = playerApi();
    api.routes["/players/me"] = json({ ...profile, externalClubs: [] });
    const user = userEvent.setup();
    renderApp("/player/matches");

    expect(await screen.findByText("Asocia un club para ver tus partidos")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clubes EA" }));

    expect(currentLocation()?.pathname).toBe("/player/ea-clubs");
    expect(await screen.findByText("Sin clubes asociados")).toBeInTheDocument();
  });

  it("says a match left EA's recent window instead of showing an empty match", async () => {
    const api = playerApi();
    api.routes["/players/me/recent-matches/ea-clubs/ea-1"] = json({ status: "not_found" });
    renderApp("/player/matches/ea-clubs/ea-1");

    expect(await screen.findByText("Partido no disponible")).toBeInTheDocument();
  });

  it("clears the session and shows login when the matches answer 401", async () => {
    const api = playerApi();
    api.routes["/players/me/recent-matches"] = () => apiError(401);
    renderApp("/player/matches");

    expect(await screen.findByText("Bienvenido de nuevo")).toBeInTheDocument();
    expect(await getSession()).toBeNull();
  });
});

describe("Mis estadísticas", () => {
  it("shows the EA profile of the selected club", async () => {
    playerApi();
    renderApp("/player/statistics");

    expect(await screen.findByRole("heading", { name: "Mis estadísticas" })).toBeInTheDocument();
    expect(await screen.findByLabelText("MVP: 1")).toBeInTheDocument();
  });

  it("asks for a game account and links to Cuentas de juego", async () => {
    const api = playerApi();
    api.routes["/players/me/game-profile"] = json({ status: "needs_game_account" });
    const user = userEvent.setup();
    renderApp("/player/statistics");

    await user.click(await screen.findByRole("button", { name: "Cuentas de juego" }));
    expect(currentLocation()?.pathname).toBe("/player/game-accounts");
    expect(await screen.findByRole("button", { name: /^davos282/ })).toBeInTheDocument();
  });
});

describe("Mis competiciones y Explorar", () => {
  it("lists the team's competitions and opens one in its context", async () => {
    playerApi();
    const user = userEvent.setup();
    renderApp("/player/competitions");

    await user.click(await screen.findByRole("button", { name: /^Liga Futrob/ }));
    expect(currentLocation()?.pathname).toBe("/orgs/org-1/competitions/competition-liga");
  });

  it("offers Explorar when the player is in no competition", async () => {
    const api = playerApi();
    api.routes["/competitions/mine"] = json({ competitions: [] });
    const user = userEvent.setup();
    renderApp("/player/competitions");

    expect(
      await screen.findByText("Tu club aún no participa en competiciones"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Explorar competiciones" }));
    expect(currentLocation()?.pathname).toBe("/player/explore");
    expect(await screen.findByRole("button", { name: /^Copa Norte/ })).toBeInTheDocument();
  });

  it("searches by name, says when nothing matches and clears the search", async () => {
    const api = playerApi();
    api.routes["/competitions/explore"] = (url) =>
      Response.json(
        url.searchParams.get("q")
          ? { items: [], total: 0, nextCursor: null }
          : { items: [explored], total: 1, nextCursor: null },
      );
    const user = userEvent.setup();
    renderApp("/player/explore");

    await screen.findByRole("button", { name: /^Copa Norte/ });
    await user.type(screen.getByLabelText("Buscar por nombre"), "Zeta");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("No encontramos competiciones")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(await screen.findByRole("button", { name: /^Copa Norte/ })).toBeInTheDocument();
  });

  it("shows an explored competition and lets its organizer manage it", async () => {
    const api = playerApi();
    const user = userEvent.setup();
    renderApp("/player/explore/competition-copa");

    expect(await screen.findByLabelText("Organizador: Liga Sur")).toBeInTheDocument();
    expect(screen.getByLabelText("Equipos inscritos: 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gestionar" })).toBeNull();

    cleanupApp();
    api.routes["/organizations/mine"] = json({
      memberships: [
        {
          organizationId: "org-2",
          organizationName: "Liga Sur",
          organizationSlug: "liga-sur",
          organizationLogo: { kind: "monogram" },
          role: "organizer",
        },
      ],
    });
    renderApp("/player/explore/competition-copa");
    await user.click(await screen.findByRole("button", { name: "Gestionar" }));
    expect(currentLocation()?.pathname).toBe("/orgs/org-2/competitions/competition-copa");
  });
});

describe("Cuentas de juego y Clubes EA", () => {
  it("explains a conflict, then saves a new game account", async () => {
    const api = playerApi();
    const posted: unknown[] = [];
    let attempt = 0;
    api.routes["/players/me/game-accounts"] = async (_url, init) => {
      posted.push(JSON.parse(String(init?.body)));
      attempt += 1;
      return attempt === 1
        ? Response.json(
            { code: "teams.game_account_conflict", messageKey: "errors.conflict" },
            { status: 409 },
          )
        : Response.json({ profile: profile.profile, gameAccount: profile.gameAccounts[0] });
    };
    const user = userEvent.setup();
    renderApp("/player/game-accounts");

    await user.click(await screen.findByRole("button", { name: "Añadir cuenta" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.type(dialog.getByLabelText("Identificador de juego"), "davos-pc");
    await user.click(dialog.getByRole("button", { name: "PC" }));
    await user.type(dialog.getByLabelText("Edición (p. ej. fc26)"), "FC 26");
    await user.click(dialog.getByRole("button", { name: "Guardar" }));

    expect(
      await dialog.findByText("Ya tienes una cuenta con ese identificador, plataforma y edición."),
    ).toBeInTheDocument();
    expect(posted[0]).toEqual({ identifier: "davos-pc", platform: "pc", gameEdition: "fc26" });

    await user.click(dialog.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("switches the personal club and associates a club found in EA", async () => {
    const api = playerApi();
    let associated: unknown;
    api.routes["/game-data/clubs/search"] = json({
      clubs: [
        {
          providerKey: "ea-clubs",
          externalClubId: "club-tigres",
          name: "Tigres FC",
          platform: "ps5",
          gameEdition: "fc27",
          imageUrl: null,
        },
      ],
    });
    api.routes["/players/me/external-club"] = async (_url, init) => {
      associated = JSON.parse(String(init?.body));
      return Response.json({
        profile: profile.profile,
        externalClub: { ...profile.externalClubs[0], externalClubId: "club-tigres" },
      });
    };
    const user = userEvent.setup();
    renderApp("/player/ea-clubs");

    const maderas = await screen.findByRole("button", { name: /^MADERAS FC/ });
    expect(screen.getByRole("button", { name: /^Cuervos FC1/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(maderas);
    expect(screen.getByRole("button", { name: /^MADERAS FC/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Añadir club" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.type(dialog.getByLabelText("Nombre del club"), "Tigres");
    await user.click(dialog.getByRole("button", { name: "Buscar" }));
    await user.click(await dialog.findByRole("button", { name: /^Tigres FC/ }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(associated).toEqual({
      providerKey: "ea-clubs",
      externalClubId: "club-tigres",
      platform: "ps5",
      gameEdition: "fc27",
      name: "Tigres FC",
      imageUrl: null,
    });
  });
});

describe("«Más» in the personal space", () => {
  it("lists the player's secondary destinations", async () => {
    playerApi();
    const user = userEvent.setup();
    renderApp("/player/more");

    await user.click(await screen.findByRole("button", { name: /^Explorar competiciones/ }));
    expect(currentLocation()?.pathname).toBe("/player/explore");
  });
});
