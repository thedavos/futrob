import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  ListAccessibleCompetitionsResponse,
  NextEncounterDto,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { clearSession, getSession, saveSession } from "@/modules/identity/session-store";
import { currentLocation } from "../../../test/expo-router";
import { apiError, installFakeApi } from "../../../test/fake-api";
import { cleanupApp, renderApp } from "../../../test/render-app";
import { gameProfile, invitation, lastMatch, profile, snapshot } from "./player-home.fixtures";

const competitions = (() => {
  const source = snapshot().competitions;
  if (source.kind !== "ready") throw new Error("Fixture competitions must be ready");
  return source.data;
})() satisfies ListAccessibleCompetitionsResponse;

const tigresFixture: NextEncounterDto = {
  encounterId: "encounter-1",
  competition: {
    id: "competition-liga",
    organizationId: "org-1",
    name: "Liga Futrob",
    timeZone: "America/Lima",
  },
  round: { number: 4, total: 10 },
  scheduledStartAt: "2026-10-02T02:00:00.000Z",
  officialMatchCount: 1,
  home: { teamId: "team-cuervos", name: "Cuervos FC1", externalClub: null },
  away: { teamId: "team-tigres", name: "Tigres FC", externalClub: null },
};

const maderasMatch: PlayerRecentProviderMatchDto = {
  ...lastMatch,
  listedExternalClubId: "club-maderas",
  match: {
    ...lastMatch.match,
    id: "match-maderas",
    home: { externalClubId: "club-maderas", name: "MADERAS FC", goals: 2, imageUrl: null },
    away: { externalClubId: "club-tigres", name: "Tigres FC", goals: 1, imageUrl: null },
  },
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
    "/players/me/recent-matches": (url) =>
      Response.json({
        status: "ready",
        matches: [
          url.searchParams.get("externalClubId") === "club-maderas" ? maderasMatch : lastMatch,
        ],
      }),
    "/players/me/game-profile": json({ status: "ready", profile: gameProfile }),
    "/competitions/mine": json(competitions),
    "/players/me/next-encounter": json({ encounter: tigresFixture }),
    "/players/me/roster-invitations": json({
      invitations: [
        invitation("invite-1", "pending"),
        invitation("invite-2", "pending"),
        invitation("invite-3", "accepted"),
      ],
    }),
  });
}

/** The card that a section heading titles. */
function section(title: string) {
  return within(screen.getByRole("heading", { name: title }).parentElement!);
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
  vi.unstubAllGlobals();
});

describe("player home on /player", () => {
  it("takes an authenticated player from the entry gate to /player and shows the dated fixture", async () => {
    playerApi();
    const user = userEvent.setup();
    renderApp("/");

    const fixture = await screen.findByRole("heading", { name: "Tu próximo enfrentamiento" });
    const hero = within(fixture.parentElement!);
    expect(hero.getByText("Cuervos FC1")).toBeInTheDocument();
    expect(hero.getByText("Tigres FC")).toBeInTheDocument();
    expect(hero.getByText("jue, 1 oct, 21:00")).toBeInTheDocument();
    expect(hero.getByText("Liga Futrob · Jornada 4")).toBeInTheDocument();
    expect(currentLocation()).toEqual({ pathname: "/player", params: { club: "club-cuervos" } });
  });

  it("shows the no-fixture state while keeping the last match and other healthy sections", async () => {
    const api = playerApi();
    api.routes["/players/me/next-encounter"] = json({ encounter: null });
    renderApp("/player?club=club-cuervos");

    expect(await screen.findByText("Sin enfrentamientos programados")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tu próximo enfrentamiento" })).toBeNull();
    expect(section("Último partido").getByText("6 – 0")).toBeInTheDocument();
    expect(section("Invitaciones").getByText("2 invitaciones por responder")).toBeInTheDocument();
  });

  it("counts only pending invitations", async () => {
    playerApi();
    renderApp("/player?club=club-cuervos");

    await screen.findByRole("heading", { name: "Invitaciones" });
    expect(section("Invitaciones").getByText("2 invitaciones por responder")).toBeInTheDocument();
  });

  it("keeps healthy sections through a failed source and recovers it on retry", async () => {
    const api = playerApi();
    api.routes["/players/me/roster-invitations"] = () => apiError(403);
    const user = userEvent.setup();
    renderApp("/player?club=club-cuervos");

    await screen.findByRole("heading", { name: "Invitaciones" });
    expect(section("Invitaciones").getByText("No se pudo cargar")).toBeInTheDocument();
    expect(section("Tu próximo enfrentamiento").getByText("Tigres FC")).toBeInTheDocument();

    const recovered = Promise.withResolvers<Response>();
    api.routes["/players/me/roster-invitations"] = () => recovered.promise;
    await user.click(screen.getByRole("button", { name: "Reintentar Invitaciones" }));

    expect(await screen.findByText("Actualizando…")).toBeInTheDocument();
    expect(section("Tu próximo enfrentamiento").getByText("Tigres FC")).toBeInTheDocument();

    recovered.resolve(Response.json({ invitations: [invitation("invite-1", "pending")] }));
    expect(await screen.findByText("1 invitación por responder")).toBeInTheDocument();
    expect(screen.queryByText("No se pudo cargar")).toBeNull();
  });

  it("starts with the first associated club and never labels club B data as club A", async () => {
    const api = playerApi();
    const user = userEvent.setup();
    renderApp("/player");

    expect(await screen.findByText("Tu actividad con Cuervos FC1")).toBeInTheDocument();
    expect(currentLocation()?.params).toEqual({ club: "club-cuervos" });
    expect(section("Último partido").getByText("6 – 0")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Selecciona un club" })).toBeNull();

    const maderas = Promise.withResolvers<Response>();
    const served = api.routes["/players/me/recent-matches"]!;
    api.routes["/players/me/recent-matches"] = (url) =>
      url.searchParams.get("externalClubId") === "club-maderas" ? maderas.promise : served(url);
    await user.click(screen.getByRole("button", { name: "MADERAS FC" }));

    expect(screen.queryByText("Tu actividad con Cuervos FC1")).toBeNull();
    expect(screen.queryByText("6 – 0")).toBeNull();

    maderas.resolve(Response.json({ status: "ready", matches: [maderasMatch] }));
    expect(await screen.findByText("Tu actividad con MADERAS FC")).toBeInTheDocument();
    expect(section("Último partido").getByText("2 – 1")).toBeInTheDocument();
    expect(screen.queryByText("6 – 0")).toBeNull();
  });

  it("loads the home snapshot once when entering without a club", async () => {
    const api = playerApi();
    renderApp("/player");

    expect(await screen.findByText("Tu actividad con Cuervos FC1")).toBeInTheDocument();
    const reads = (path: string) => api.requests.filter((request) => request.path === path);
    expect(reads("/players/me/recent-matches")).toHaveLength(1);
    expect(reads("/players/me/game-profile")).toHaveLength(1);
    expect(reads("/players/me/next-encounter")).toHaveLength(1);
    expect(reads("/players/me/roster-invitations")).toHaveLength(1);
  });

  it("keeps healthy sections when the profile fails on entry without a club", async () => {
    const api = playerApi();
    api.routes["/players/me"] = () => apiError(503);
    renderApp("/player");

    expect(await screen.findByText("2 invitaciones por responder")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Liga Futrob, Liga · En curso" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar tu inicio")).toBeNull();
  });

  it("keeps an explicit club that is not associated instead of falling back to the first", async () => {
    playerApi();
    renderApp("/player?club=club-unknown");

    expect(
      await screen.findByRole("heading", { name: "Ese club no está asociado a tu perfil" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Tu actividad con/)).toBeNull();
    expect(screen.queryByText("6 – 0")).toBeNull();
  });

  it("asks for a club when the profile has none associated", async () => {
    const api = playerApi();
    api.routes["/players/me"] = json({ ...profile, externalClubs: [] });
    renderApp("/player");

    expect(await screen.findByRole("heading", { name: "Selecciona un club" })).toBeInTheDocument();
    expect(screen.queryByText(/^Tu actividad con/)).toBeNull();
    expect(currentLocation()?.params).toEqual({});
  });

  it("shows the home for a 200 session and keeps the stored session", async () => {
    playerApi();
    renderApp("/player?club=club-cuervos");

    expect(await screen.findByText("Tu actividad con Cuervos FC1")).toBeInTheDocument();
    expect(await getSession()).toMatchObject({ token: "session-token" });
  });

  it.each(["/player?club=club-cuervos", "/player"])(
    "clears the session and shows login when the home answers 401 (%s)",
    async (href) => {
      const api = playerApi();
      api.routes["/players/me"] = () => apiError(401);
      renderApp(href);

      expect(await screen.findByText("Bienvenido de nuevo")).toBeInTheDocument();
      expect(screen.queryByText("Tu actividad con Cuervos FC1")).toBeNull();
      expect(await getSession()).toBeNull();
    },
  );

  it("opens an implemented competition screen from the home", async () => {
    playerApi();
    const user = userEvent.setup();
    renderApp("/player?club=club-cuervos");

    await user.click(await screen.findByRole("button", { name: "Liga Futrob, Liga · En curso" }));

    expect(await screen.findByText("fc26 · league · published")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Liga Futrob" })).toBeInTheDocument();
    expect(currentLocation()?.pathname).toBe("/orgs/org-1/competitions/competition-liga");
  });

  it("cancels pending home reads on unmount so a late 401 changes nothing", async () => {
    const api = playerApi();
    const late = Promise.withResolvers<Response>();
    const held = ["/players/me", "/players/me/next-encounter"];
    for (const path of held) api.routes[path] = () => late.promise;
    renderApp("/player?club=club-cuervos");

    await waitFor(() =>
      expect(api.requests.filter((request) => request.path === "/players/me")).toHaveLength(1),
    );
    cleanupApp();
    await act(async () => late.resolve(apiError(401)));

    const pending = api.requests.filter((request) => held.includes(request.path));
    expect(pending.map((request) => [request.path, request.signal?.aborted])).toEqual([
      ["/players/me", true],
      ["/players/me/next-encounter", true],
    ]);
    expect(await getSession()).toMatchObject({ token: "session-token" });
  });
});
