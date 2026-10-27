import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GetMyPlayerProfileResponse, MembershipSummaryDto } from "@futrob/api-contracts";
import type { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createMobileQueryClient } from "@/modules/query/create-query-client";
import { clearSession, getSession, saveSession } from "./session-store";
import {
  profile,
  snapshot,
  invitation,
  lastMatch,
  gameProfile,
} from "../player-home/player-home.fixtures";
import { currentLocation } from "../../../test/expo-router";
import { apiError, installFakeApi, type FakeRoute } from "../../../test/fake-api";
import { cleanupApp, renderApp } from "../../../test/render-app";

type Account = {
  readonly token: string;
  readonly user: { readonly id: string; readonly name: string; readonly email: string };
  profile: GetMyPlayerProfileResponse;
  memberships: MembershipSummaryDto[];
  pendingInvitations: number;
  revoked: boolean;
};

const competitions = (() => {
  const source = snapshot().competitions;
  if (source.kind !== "ready") throw new Error("Fixture competitions must be ready");
  return source.data;
})();

function accounts() {
  const ana: Account = {
    token: "token-ana",
    user: { id: "actor-ana", name: "Ana", email: "ana@club.mx" },
    profile,
    memberships: [
      {
        organizationId: "org-ana",
        organizationName: "Liga de Ana",
        organizationSlug: "liga-de-ana",
        organizationLogo: { kind: "monogram" },
        role: "organizer",
      },
    ],
    pendingInvitations: 2,
    revoked: false,
  };
  const beto: Account = {
    token: "token-beto",
    user: { id: "actor-beto", name: "Beto", email: "beto@club.mx" },
    profile: { ...profile, externalClubs: profile.externalClubs.slice(0, 1) },
    memberships: [],
    pendingInvitations: 1,
    revoked: false,
  };
  return { ana, beto };
}

/** Serves each account's own data by bearer, and Better Auth sign-in/out by email. */
function installAccountsApi({ ana, beto }: ReturnType<typeof accounts>) {
  const byToken = new Map([ana, beto].map((account) => [account.token, account]));
  const signOuts: string[] = [];
  const authorized =
    (serve: (account: Account, url: URL) => Response | Promise<Response>): FakeRoute =>
    (url, init) => {
      const bearer = new Headers(init?.headers).get("Authorization")?.replace(/^Bearer /, "");
      const account = bearer ? byToken.get(bearer) : undefined;
      if (!account || account.revoked) return apiError(401);
      return serve(account, url);
    };
  const api = installFakeApi({
    "/api/auth/sign-in/email": (_url, init) => {
      const { email } = JSON.parse(String(init?.body)) as { email: string };
      const account = [ana, beto].find((candidate) => candidate.user.email === email)!;
      return Response.json({ token: account.token, user: account.user });
    },
    "/api/auth/sign-out": (_url, init) => {
      signOuts.push(new Headers(init?.headers).get("Authorization") ?? "");
      return new Response(null, { status: 200 });
    },
    "/identity/onboarding": authorized(() =>
      Response.json({
        completed: true,
        completedAt: "2026-09-01T00:00:00.000Z",
        version: 1,
        path: "player",
        currentStep: null,
      }),
    ),
    "/organizations/post-auth-destination": authorized((account) =>
      Response.json({ destination: { kind: "personal" }, memberships: account.memberships }),
    ),
    "/organizations/mine": authorized((account) =>
      Response.json({ memberships: account.memberships }),
    ),
    "/authorization/effective-access": authorized((account) =>
      Response.json({ actorId: account.user.id, scope: {}, roles: [], permissions: [] }),
    ),
    "/players/me": authorized((account) => Response.json(account.profile)),
    "/players/me/recent-matches": authorized(() =>
      Response.json({ status: "ready", matches: [lastMatch] }),
    ),
    "/players/me/game-profile": authorized(() =>
      Response.json({ status: "ready", profile: gameProfile }),
    ),
    "/competitions/mine": authorized(() => Response.json(competitions)),
    "/players/me/next-encounter": authorized(() => Response.json({ encounter: null })),
    "/players/me/roster-invitations": authorized((account) =>
      Response.json({
        invitations: Array.from({ length: account.pendingInvitations }, (_, index) =>
          invitation(`${account.user.id}-invite-${index}`, "pending"),
        ),
      }),
    ),
  });
  return { ...api, signOuts };
}

async function signIn(user: ReturnType<typeof userEvent.setup>, account: Account) {
  await user.type(await screen.findByPlaceholderText("ejemplo@correo.com"), account.user.email);
  await user.type(screen.getByPlaceholderText("Ingresa tu contraseña"), "contraseña-segura-2026");
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
}

async function signOut(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
  await screen.findByRole("button", { name: "Iniciar sesión" });
}

function renderSignedInApp() {
  const queryClient = createMobileQueryClient();
  renderApp("/", { queryClient });
  return queryClient;
}

function cachedText(queryClient: QueryClient): string {
  return JSON.stringify(
    queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.state.data),
  );
}

afterEach(async () => {
  cleanupApp();
  await clearSession();
  vi.unstubAllGlobals();
});

describe("switching accounts on one device", () => {
  it("shows the next account only its own profile, home and organizations", async () => {
    const { ana, beto } = accounts();
    const api = installAccountsApi({ ana, beto });
    await saveSession(ana);
    const user = userEvent.setup();
    const queryClient = renderSignedInApp();

    expect(await screen.findByText("2 invitaciones por responder")).toBeInTheDocument();
    expect(cachedText(queryClient)).toMatch(/actor-ana/);
    expect(screen.getByRole("button", { name: "MADERAS FC" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Organizaciones" })).toBeInTheDocument();

    await signOut(user);
    expect(api.signOuts).toEqual([`Bearer ${ana.token}`]);
    expect(cachedText(queryClient)).not.toMatch(/actor-ana|Liga de Ana/);
    await signIn(user, beto);

    expect(await screen.findByText("1 invitación por responder")).toBeInTheDocument();
    expect(currentLocation()).toEqual({ pathname: "/player", params: { club: "club-cuervos" } });
    expect(screen.queryByText("2 invitaciones por responder")).toBeNull();
    expect(screen.queryByRole("button", { name: "MADERAS FC" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Organizaciones" })).toBeNull();
    await expect(getSession()).resolves.toMatchObject({ token: beto.token, user: beto.user });
  });

  it("never lets a response the previous account left pending reach the next account", async () => {
    const { ana, beto } = accounts();
    const api = installAccountsApi({ ana, beto });
    const anaMemberships = Promise.withResolvers<Response>();
    const served = api.routes["/organizations/mine"]!;
    api.routes["/organizations/mine"] = (url, init) =>
      new Headers(init?.headers).get("Authorization") === `Bearer ${ana.token}`
        ? anaMemberships.promise
        : served(url, init);
    await saveSession(ana);
    const user = userEvent.setup();
    renderSignedInApp();

    await screen.findByText("Cargando…");
    await signOut(user);
    await signIn(user, beto);
    expect(await screen.findByText("1 invitación por responder")).toBeInTheDocument();

    anaMemberships.resolve(Response.json({ memberships: ana.memberships }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByText("1 invitación por responder")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Organizaciones" })).toBeNull();
  });

  it("keeps the next account signed in when the previous account's request settles as 401", async () => {
    const { ana, beto } = accounts();
    const api = installAccountsApi({ ana, beto });
    const anaMemberships = Promise.withResolvers<Response>();
    const served = api.routes["/organizations/mine"]!;
    api.routes["/organizations/mine"] = (url, init) =>
      new Headers(init?.headers).get("Authorization") === `Bearer ${ana.token}`
        ? anaMemberships.promise
        : served(url, init);
    await saveSession(ana);
    const user = userEvent.setup();
    renderSignedInApp();

    await screen.findByText("Cargando…");
    await signOut(user);
    await signIn(user, beto);
    expect(await screen.findByText("1 invitación por responder")).toBeInTheDocument();

    anaMemberships.resolve(apiError(401));
    await new Promise((resolve) => setTimeout(resolve, 50));

    await expect(getSession()).resolves.toMatchObject({ token: beto.token });
    expect(screen.getByText("1 invitación por responder")).toBeInTheDocument();
  });

  it("drops the revoked account's data when a 401 sends the user to login", async () => {
    const { ana, beto } = accounts();
    installAccountsApi({ ana, beto });
    await saveSession(ana);
    const user = userEvent.setup();
    const queryClient = renderSignedInApp();

    expect(await screen.findByText("2 invitaciones por responder")).toBeInTheDocument();
    ana.revoked = true;
    await user.click(screen.getByRole("button", { name: "Organizaciones" }));

    expect(await screen.findByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    await expect(getSession()).resolves.toBeNull();
    expect(cachedText(queryClient)).not.toMatch(/actor-ana|Liga de Ana/);

    await signIn(user, beto);
    expect(await screen.findByText("1 invitación por responder")).toBeInTheDocument();
    expect(screen.queryByText("2 invitaciones por responder")).toBeNull();
    expect(screen.queryByRole("button", { name: "Organizaciones" })).toBeNull();
  });

  it("reads fresh data when the same account signs back in", async () => {
    const { ana, beto } = accounts();
    installAccountsApi({ ana, beto });
    await saveSession(ana);
    const user = userEvent.setup();
    renderSignedInApp();

    expect(await screen.findByText("2 invitaciones por responder")).toBeInTheDocument();
    await signOut(user);
    ana.pendingInvitations = 3;
    await signIn(user, ana);

    expect(await screen.findByText("3 invitaciones por responder")).toBeInTheDocument();
    expect(screen.queryByText("2 invitaciones por responder")).toBeNull();
  });

  it("still clears the local session and its data when remote sign-out fails", async () => {
    const { ana, beto } = accounts();
    const api = installAccountsApi({ ana, beto });
    api.routes["/api/auth/sign-out"] = () => apiError(503);
    await saveSession(ana);
    const user = userEvent.setup();
    const queryClient = renderSignedInApp();

    expect(await screen.findByText("2 invitaciones por responder")).toBeInTheDocument();
    await signOut(user);
    await expect(getSession()).resolves.toBeNull();
    expect(cachedText(queryClient)).not.toMatch(/actor-ana|Liga de Ana/);

    await signIn(user, beto);
    expect(await screen.findByText("1 invitación por responder")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "MADERAS FC" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Organizaciones" })).toBeNull();
  });
});
