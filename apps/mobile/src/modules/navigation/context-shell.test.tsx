import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MembershipSummaryDto } from "@futrob/api-contracts";
import * as SecureStore from "expo-secure-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { clearSession, saveSession } from "@/modules/identity/session-store";
import { profile, snapshot } from "@/modules/player-home/player-home.fixtures";
import { currentLocation } from "../../../test/expo-router";
import { apiError, installFakeApi } from "../../../test/fake-api";
import { cleanupApp, renderApp } from "../../../test/render-app";

const competitions = (() => {
  const source = snapshot().competitions;
  if (source.kind !== "ready") throw new Error("Fixture competitions must be ready");
  return source.data;
})();

const membership: MembershipSummaryDto = {
  organizationId: "org-1",
  organizationName: "Liga Norte",
  organizationSlug: "liga-norte",
  organizationLogo: { kind: "monogram" },
  role: "organizer",
};

const json = (data: unknown) => () => Response.json(data);

function shellApi({ allowed = [] as string[] } = {}) {
  return installFakeApi({
    "/identity/onboarding": json({
      completed: true,
      completedAt: "2026-09-01T00:00:00.000Z",
      version: 1,
      path: "organization",
      currentStep: null,
    }),
    "/identity/account/deletion": json({ deletion: { status: "active" }, blockers: [] }),
    "/organizations/post-auth-destination": json({
      destination: { kind: "organization", organizationId: "org-1" },
      memberships: [membership],
    }),
    "/organizations/mine": json({ memberships: [membership] }),
    "/competitions/mine": json(competitions),
    "/players/me": json(profile),
    "/authorization/effective-access": json({
      actorId: "actor-1",
      scope: { organizationId: "org-1" },
      roles: [],
      permissions: allowed.map((permission) => ({
        permission,
        allowed: true,
        decidedAt: "organization",
      })),
    }),
  });
}

async function openSelector(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /^Cambiar de contexto/ }));
  return within(await screen.findByRole("dialog"));
}

beforeEach(async () => {
  await saveSession({
    token: "session-token",
    user: { id: "actor-1", name: "Ana", email: "ana@example.com" },
  });
});

afterEach(async () => {
  cleanupApp();
  await clearSession();
  await SecureStore.deleteItemAsync("futrob.mobile.language");
  vi.unstubAllGlobals();
});

describe("context shell", () => {
  it("names the active organization and lists every space in the selector", async () => {
    shellApi({ allowed: [MOBILE_PERMISSION.organizationsRead] });
    const user = userEvent.setup();
    renderApp("/orgs/org-1");

    expect(
      await screen.findByRole("button", { name: "Cambiar de contexto. Actual: Liga Norte" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: "Inicio" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const dialog = await openSelector(user);
    expect(dialog.getByRole("heading", { name: "Cambiar de contexto" })).toBeInTheDocument();
    expect(await dialog.findByRole("button", { name: "Liga Norte" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(dialog.getByRole("button", { name: "Espacio personal" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(dialog.getByRole("button", { name: "Cuervos FC1" })).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "MADERAS FC" })).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Liga Futrob" })).toBeInTheDocument();
  });

  it("switches context from the selector, and switching tabs keeps the context", async () => {
    shellApi({ allowed: [MOBILE_PERMISSION.organizationsRead] });
    const user = userEvent.setup();
    renderApp("/orgs/org-1");

    const dialog = await openSelector(user);
    await user.click(await dialog.findByRole("button", { name: "Liga Futrob" }));

    expect(currentLocation()?.pathname).toBe("/orgs/org-1/competitions/competition-liga");
    expect(
      await screen.findByRole("button", { name: "Cambiar de contexto. Actual: Liga Futrob" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Más" }));

    expect(currentLocation()?.pathname).toBe("/orgs/org-1/competitions/competition-liga/more");
    expect(
      await screen.findByRole("button", { name: "Cambiar de contexto. Actual: Liga Futrob" }),
    ).toBeInTheDocument();
  });

  it("hides a tab the actor may not open and still offers «Más»", async () => {
    shellApi({ allowed: [] });
    renderApp("/orgs/org-1/more");

    expect(await screen.findByRole("tab", { name: "Más" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await screen.findByRole("button", { name: "Cambiar de contexto. Actual: Liga Norte" });
    expect(screen.queryByRole("tab", { name: "Inicio" })).toBeNull();
  });

  it("lists «Disputas» in a competition's «Más» only for actors who approve results", async () => {
    shellApi({ allowed: [MOBILE_PERMISSION.encountersResultsApprove] });
    const user = userEvent.setup();
    renderApp("/orgs/org-1/competitions/competition-liga/more");

    await user.click(await screen.findByRole("button", { name: "Disputas" }));
    expect(currentLocation()?.pathname).toBe("/orgs/org-1/competitions/competition-liga/disputes");
  });

  it("hides «Disputas» from a competition's «Más» without approval", async () => {
    shellApi({ allowed: [MOBILE_PERMISSION.competitionsRead] });
    renderApp("/orgs/org-1/competitions/competition-liga/more");

    expect(await screen.findByRole("button", { name: "Cuenta" })).toBeInTheDocument();
    await screen.findByRole("button", { name: "Cambiar de contexto. Actual: Liga Futrob" });
    expect(screen.queryByRole("button", { name: "Disputas" })).toBeNull();
  });

  it("shows a recoverable error when the spaces fail to load, then the spaces on retry", async () => {
    const api = shellApi({ allowed: [MOBILE_PERMISSION.organizationsRead] });
    const served = api.routes["/organizations/mine"]!;
    api.routes["/organizations/mine"] = () => apiError(503);
    const user = userEvent.setup();
    renderApp("/orgs/org-1/more");

    const dialog = await openSelector(user);
    expect(
      await dialog.findByRole("heading", { name: "No pudimos cargar tus espacios" }),
    ).toBeInTheDocument();
    expect(dialog.queryByText("Sin organizaciones todavía")).toBeNull();

    api.routes["/organizations/mine"] = served;
    await user.click(dialog.getByRole("button", { name: "Reintentar" }));

    expect(await dialog.findByRole("button", { name: "Liga Norte" })).toBeInTheDocument();
  });

  it("says when a group is empty instead of hiding it", async () => {
    const api = shellApi();
    api.routes["/organizations/mine"] = json({ memberships: [] });
    api.routes["/competitions/mine"] = json({ competitions: [] });
    api.routes["/players/me"] = json({ ...profile, externalClubs: [] });
    api.routes["/organizations/post-auth-destination"] = json({
      destination: { kind: "personal" },
      memberships: [],
    });
    const user = userEvent.setup();
    renderApp("/player/more");

    expect(
      await screen.findByRole("button", { name: "Cambiar de contexto. Actual: Espacio personal" }),
    ).toBeInTheDocument();
    const dialog = await openSelector(user);
    expect(await dialog.findByText("Sin competiciones todavía")).toBeInTheDocument();
    expect(dialog.getByText("Sin clubes todavía")).toBeInTheDocument();
    expect(dialog.getByText("Sin organizaciones todavía")).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Espacio personal" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("keeps the chosen club across personal tabs and back on Inicio", async () => {
    shellApi();
    const user = userEvent.setup();
    renderApp("/player/more");

    expect(
      await screen.findByRole("button", { name: "Cambiar de contexto. Actual: Cuervos FC1" }),
    ).toBeInTheDocument();
    const dialog = await openSelector(user);
    await user.click(await dialog.findByRole("button", { name: "MADERAS FC" }));
    expect(currentLocation()).toEqual({ pathname: "/player", params: { club: "club-maderas" } });

    await user.click(await screen.findByRole("tab", { name: "Más" }));
    expect(
      await screen.findByRole("button", { name: "Cambiar de contexto. Actual: MADERAS FC" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Inicio" }));
    await waitFor(() =>
      expect(currentLocation()).toEqual({ pathname: "/player", params: { club: "club-maderas" } }),
    );
    expect(
      await screen.findByRole("button", { name: "Cambiar de contexto. Actual: MADERAS FC" }),
    ).toBeInTheDocument();
  });

  it("keeps a club opened by link across personal tabs without using the selector", async () => {
    shellApi();
    const user = userEvent.setup();
    renderApp("/player?club=club-maderas");

    expect(
      await screen.findByRole("button", { name: "Cambiar de contexto. Actual: MADERAS FC" }),
    ).toBeInTheDocument();

    await user.click(await screen.findByRole("tab", { name: "Más" }));
    expect(currentLocation()?.pathname).toBe("/player/more");
    expect(
      await screen.findByRole("button", { name: "Cambiar de contexto. Actual: MADERAS FC" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Inicio" }));
    await waitFor(() =>
      expect(currentLocation()).toEqual({ pathname: "/player", params: { club: "club-maderas" } }),
    );
  });

  it("relabels the header and tabs when the language changes in «Más»", async () => {
    shellApi({ allowed: [MOBILE_PERMISSION.organizationsRead] });
    const user = userEvent.setup();
    renderApp("/orgs/org-1/more");

    await user.click(await screen.findByRole("button", { name: "English" }));

    expect(await screen.findByRole("tab", { name: "More" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Home" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Switch context. Current: Liga Norte" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
