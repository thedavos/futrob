import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { clearSession, getSession, saveSession } from "@/modules/identity/session-store";
import { createMobileQueryClient } from "@/modules/query/create-query-client";
import { installFakeApi, type FakeRoute } from "../../../test/fake-api";
import { currentLocation } from "../../../test/expo-router";
import { cleanupApp, renderApp } from "../../../test/render-app";

const ANA = { token: "ana-token", user: { id: "actor-ana", name: "Ana", email: "ana@club.mx" } };
const ACTIVE = { deletion: { status: "active" }, blockers: [] };
const SCHEDULED = {
  deletion: {
    status: "scheduled",
    requestedAt: "2026-11-10T09:00:00.000Z",
    scheduledFor: "2026-12-10T09:00:00.000Z",
  },
  blockers: [],
};

afterEach(async () => {
  cleanupApp();
  await clearSession();
  vi.unstubAllGlobals();
});

/** A finished player account whose deletion state lives in `state.deletion`. */
function accountApi(state: { deletion: unknown }, extra: Record<string, FakeRoute> = {}) {
  const signOuts: string[] = [];
  const api = installFakeApi({
    "/identity/onboarding": () =>
      Response.json({
        completed: true,
        completedAt: "2026-09-01T00:00:00.000Z",
        version: 1,
        path: "player",
        currentStep: null,
      }),
    "/organizations/post-auth-destination": () =>
      Response.json({ destination: { kind: "personal" }, memberships: [] }),
    "/identity/account/deletion": (_url, init) => {
      if (init?.method === "POST") {
        const { password } = JSON.parse(String(init.body)) as { password: string };
        if (password !== "secret-pass") {
          return Response.json(
            {
              code: "identity.reauthentication_failed",
              messageKey: "errors.identity.reauthentication_failed",
            },
            { status: 403 },
          );
        }
        state.deletion = SCHEDULED;
      }
      if (init?.method === "DELETE") state.deletion = ACTIVE;
      return Response.json(state.deletion);
    },
    "/api/auth/sign-out": (_url, init) => {
      signOuts.push(new Headers(init?.headers).get("Authorization") ?? "");
      return new Response(null, { status: 200 });
    },
    ...extra,
  });
  return { ...api, signOuts };
}

describe("account navigation on mobile", () => {
  it("leaves a directly opened account menu through the destination gate", async () => {
    accountApi({ deletion: ACTIVE });
    await saveSession(ANA);
    const user = userEvent.setup();
    renderApp("/account");

    await screen.findByRole("heading", { name: "Cuenta" });
    await user.click(screen.getByRole("button", { name: "Volver" }));

    await waitFor(() => expect(currentLocation()?.pathname).toBe("/player"));
  });

  it.each([
    ["/account/security", "Seguridad"],
    ["/account/sessions", "Sesiones"],
    ["/account/delete", "Eliminar cuenta"],
  ])("returns from directly opened %s to the account menu", async (route, title) => {
    accountApi({ deletion: ACTIVE }, { "/api/auth/list-sessions": () => Response.json([]) });
    await saveSession(ANA);
    const user = userEvent.setup();
    renderApp(route);

    await screen.findByRole("heading", { name: title });
    await user.click(screen.getByRole("button", { name: "Volver" }));

    expect(await screen.findByRole("heading", { name: "Cuenta" })).toBeInTheDocument();
    expect(currentLocation()?.pathname).toBe("/account");
  });

  it("returns to the previous account screen when history is available", async () => {
    accountApi({ deletion: ACTIVE });
    await saveSession(ANA);
    const user = userEvent.setup();
    renderApp("/account");

    await user.click(await screen.findByRole("button", { name: "Seguridad" }));
    await screen.findByRole("heading", { name: "Seguridad" });
    await user.click(screen.getByRole("button", { name: "Volver" }));

    expect(await screen.findByRole("heading", { name: "Cuenta" })).toBeInTheDocument();
    expect(currentLocation()?.pathname).toBe("/account");
  });
});

describe("account deletion on mobile", () => {
  it("keeps the account on a wrong password, then schedules it and returns to sign-in", async () => {
    const state = { deletion: ACTIVE as unknown };
    const api = accountApi(state);
    await saveSession(ANA);
    const user = userEvent.setup();
    renderApp("/account/delete");

    const password = await screen.findByLabelText("Contraseña");
    await user.type(password, "guess");
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
    expect(
      await screen.findByText("La contraseña no coincide. La cuenta sigue activa."),
    ).toBeInTheDocument();
    expect(await getSession()).not.toBeNull();

    await user.clear(password);
    await user.type(password, "secret-pass");
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));

    await waitFor(() => expect(currentLocation()?.pathname).toBe("/(auth)/login"));
    expect(await getSession()).toBeNull();
    expect(api.signOuts).toEqual([`Bearer ${ANA.token}`]);
  });

  it("explains each responsibility to hand over instead of offering the request", async () => {
    accountApi({
      deletion: {
        deletion: { status: "active" },
        blockers: [
          {
            kind: "active-captain",
            competitionId: "c-1",
            competitionName: "Apertura",
            teamId: "t-1",
            teamName: "Halcones",
          },
        ],
      },
    });
    await saveSession(ANA);
    renderApp("/account/delete");

    expect(await screen.findByText(/capitán de Halcones en Apertura/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar mi cuenta" })).toBeNull();
  });

  it("can request deletion again immediately after cancelling with a fresh cached status", async () => {
    const state = { deletion: SCHEDULED as unknown };
    accountApi(state);
    await saveSession(ANA);
    const user = userEvent.setup();
    const queryClient = createMobileQueryClient();
    renderApp("/account/deletion-scheduled", { queryClient });

    await screen.findByText("Tu cuenta se eliminará el 10 de diciembre de 2026");
    await user.click(screen.getByRole("button", { name: "Cancelar eliminación" }));
    await user.click(await screen.findByRole("button", { name: "Cuenta" }));
    await user.click(await screen.findByRole("button", { name: "Eliminar cuenta" }));

    expect(await screen.findByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.queryByText("Tu cuenta se eliminará el 10 de diciembre de 2026")).toBeNull();
    queryClient.clear();
  });

  it("signs in to the grace screen only, and cancelling restores the app", async () => {
    const state = { deletion: SCHEDULED as unknown };
    accountApi(state, {
      "/players/me/profile": () => Response.json({ code: "x", messageKey: "x" }, { status: 503 }),
    });
    await saveSession(ANA);
    const user = userEvent.setup();
    renderApp("/player");

    await waitFor(() => expect(currentLocation()?.pathname).toBe("/account/deletion-scheduled"));
    expect(
      await screen.findByText("Tu cuenta se eliminará el 10 de diciembre de 2026"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar eliminación" }));

    await waitFor(() => expect(currentLocation()?.pathname).toBe("/player"));
    expect(state.deletion).toEqual(ACTIVE);
  });
});

describe("sessions on mobile", () => {
  it("lists this device first and signs another session out right away", async () => {
    const revoked: unknown[] = [];
    accountApi(
      { deletion: ACTIVE },
      {
        "/api/auth/list-sessions": () =>
          Response.json([
            {
              id: "s-web",
              token: "web-token",
              createdAt: "2026-11-01T10:00:00.000Z",
              updatedAt: "2026-11-09T10:00:00.000Z",
              expiresAt: "2026-12-01T10:00:00.000Z",
              userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36",
            },
            {
              id: "s-phone",
              token: ANA.token,
              createdAt: "2026-11-02T10:00:00.000Z",
              updatedAt: "2026-11-03T10:00:00.000Z",
              expiresAt: "2026-12-02T10:00:00.000Z",
              userAgent: "okhttp/4.12.0",
            },
          ]),
        "/api/auth/revoke-session": (_url, init) => {
          revoked.push(JSON.parse(String(init?.body)));
          return Response.json({ status: true });
        },
      },
    );
    await saveSession(ANA);
    const user = userEvent.setup();
    renderApp("/account/sessions");

    expect(await screen.findByText("App de Futrob · Esta sesión")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar la sesión de Chrome en Windows" }));

    await waitFor(() => expect(revoked).toEqual([{ token: "web-token" }]));
  });
});
