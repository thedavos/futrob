// @vitest-environment jsdom

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";

type User = { readonly id: string; readonly name: string };

const ANA: User = { id: "user-ana", name: "Ana Ruiz" };
const BRUNO: User = { id: "user-bruno", name: "Bruno Díaz" };

type Hold = { readonly promise: Promise<void>; readonly resolve: () => void };

function hold(): Hold {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** The browser's shared cookie jar: every tab reads the same session. */
let sessionUser: User | null;
let sessionStatus: number;
let heldSession: Hold | null;
let heldPrivateRead: Hold | null;
let visibility: DocumentVisibilityState;
let closeTab: (() => void) | undefined;

function serve() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input), "http://localhost");
      if (url.pathname === "/api/auth/get-session") {
        const held = heldSession;
        heldSession = null;
        await held?.promise;
        if (sessionStatus !== 200) return Response.json({}, { status: sessionStatus });
        const user = sessionUser;
        return Response.json(
          user
            ? { user: { ...user, email: `${user.id}@futrob.test` }, session: { id: "s" } }
            : null,
        );
      }
      if (url.pathname === "/api/v1/players/me") {
        await heldPrivateRead?.promise;
        return Response.json({ name: sessionUser?.name });
      }
      return new Response(null, { status: 404 });
    }),
  );
}

/** Private content: the signed-in player's name plus a draft only this tab holds. */
function PlayerSpace() {
  const me = useQuery({
    queryKey: ["players", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/players/me");
      const body: { name: string } = await response.json();
      return body;
    },
  });
  const [note, setNote] = useState("");
  return (
    <section>
      {me.data ? <h1>{me.data.name}</h1> : <p>Cargando jugador…</p>}
      <input aria-label="Nota" value={note} onChange={(event) => setNote(event.target.value)} />
    </section>
  );
}

/** One browser tab: its own module graph (session store) and its own QueryClient. */
async function openTab(locale: Locale = "es") {
  vi.resetModules();
  const [{ PrivateContentGate }, { I18nProvider }, { authClient }, { cleanStores }] =
    await Promise.all([
      import("./private-content-gate.tsx"),
      import("@/shared/presentation/i18n/i18n-provider.tsx"),
      import("@/modules/identity/auth-client.ts"),
      import("nanostores"),
    ]);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  closeTab = () => {
    cleanStores(...Object.values(authClient.$store.atoms));
    queryClient.clear();
  };
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <PrivateContentGate>
          <PlayerSpace />
        </PrivateContentGate>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

function setVisibility(next: DocumentVisibilityState) {
  visibility = next;
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

/** Another tab changes who is signed in. This tab is suspended and never hears the notice. */
function anotherTabSignsIn(user: User | null) {
  sessionUser = user;
}

/** Another tab, with its own QueryClient, signs in and announces it to every open tab. */
async function anotherTabSignsInAndAnnounces(user: User) {
  const { announceIdentityChange } = await import("@/shared/presentation/query/identity-change.ts");
  sessionUser = user;
  announceIdentityChange(new QueryClient());
}

function holdNextSessionCheck(): () => Promise<void> {
  const held = hold();
  heldSession = held;
  return async () => {
    await act(async () => {
      held.resolve();
      await held.promise;
    });
  };
}

// Transform the tab's module graph once, so no test pays the cold import against its timeout.
beforeAll(async () => {
  await Promise.all([
    import("./private-content-gate.tsx"),
    import("@/shared/presentation/i18n/i18n-provider.tsx"),
    import("@/shared/presentation/query/identity-change.ts"),
  ]);
}, 60_000);

beforeEach(() => {
  sessionUser = ANA;
  sessionStatus = 200;
  heldSession = null;
  heldPrivateRead = null;
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  serve();
});

afterEach(() => {
  heldPrivateRead?.resolve();
  cleanup();
  // Nanostores delays unmount cleanup; close this module graph before jsdom goes away.
  closeTab?.();
  closeTab = undefined;
  vi.unstubAllGlobals();
});

describe("private content when the tab comes back", () => {
  it("never shows the previous user's data after another tab signed in someone else", async () => {
    await openTab();
    expect(await screen.findByRole("heading", { name: "Ana Ruiz" })).toBeVisible();
    await userEvent.type(screen.getByRole("textbox", { name: "Nota" }), "nota");

    setVisibility("hidden");
    anotherTabSignsIn(BRUNO);
    const answerSessionCheck = holdNextSessionCheck();
    setVisibility("visible");

    expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Nota" })).toBeNull();
    expect(screen.getByText("Comprobando sesión…")).toBeVisible();

    heldPrivateRead = hold();
    await answerSessionCheck();

    expect(await screen.findByText("Cargando jugador…")).toBeVisible();
    expect(screen.queryByText("Ana Ruiz")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Nota" })).toHaveValue("");

    await act(async () => heldPrivateRead?.resolve());
    expect(await screen.findByRole("heading", { name: "Bruno Díaz" })).toBeVisible();
  });

  it("gives the same user their screen back, cache and draft included, once confirmed", async () => {
    await openTab("en");
    expect(await screen.findByRole("heading", { name: "Ana Ruiz" })).toBeVisible();
    await userEvent.type(screen.getByRole("textbox", { name: "Nota" }), "draft");

    setVisibility("hidden");
    heldPrivateRead = hold();
    const answerSessionCheck = holdNextSessionCheck();
    setVisibility("visible");

    expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull();
    expect(screen.getByText("Checking your session…")).toBeVisible();

    await answerSessionCheck();

    expect(await screen.findByRole("heading", { name: "Ana Ruiz" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Nota" })).toHaveValue("draft");
    expect(screen.queryByText("Checking your session…")).toBeNull();
  });

  it("drops the previous user's data when another tab signed out", async () => {
    await openTab();
    expect(await screen.findByRole("heading", { name: "Ana Ruiz" })).toBeVisible();

    setVisibility("hidden");
    anotherTabSignsIn(null);
    const answerSessionCheck = holdNextSessionCheck();
    setVisibility("visible");

    expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull();

    await answerSessionCheck();

    expect(screen.queryByText("Ana Ruiz")).toBeNull();
    expect(screen.getByText("Comprobando sesión…")).toBeVisible();
  });

  it("keeps the data hidden when the session can't be checked, and shows it after a retry", async () => {
    await openTab();
    expect(await screen.findByRole("heading", { name: "Ana Ruiz" })).toBeVisible();

    setVisibility("hidden");
    sessionStatus = 503;
    setVisibility("visible");

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos comprobar tu sesión.");
    expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull();

    sessionStatus = 200;
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { name: "Ana Ruiz" })).toBeVisible();
  });

  it("shows the screen of a tab that opened hidden and came forward before the gate listened", async () => {
    // The first read happens while rendering; the tab is visible by the time effects run,
    // and its visibilitychange fired before anyone listened.
    let reads = 0;
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (reads++ === 0 ? "hidden" : "visible"),
    });

    await openTab();

    expect(await screen.findByRole("heading", { name: "Ana Ruiz" })).toBeVisible();
    expect(screen.queryByText("Comprobando sesión…")).toBeNull();
  });

  it("hides the previous user's data in a visible tab as soon as the notice arrives", async () => {
    await openTab();
    expect(await screen.findByRole("heading", { name: "Ana Ruiz" })).toBeVisible();

    const answerSessionCheck = holdNextSessionCheck();
    await anotherTabSignsInAndAnnounces(BRUNO);

    expect(await screen.findByText("Comprobando sesión…")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull();

    await answerSessionCheck();

    expect(await screen.findByRole("heading", { name: "Bruno Díaz" })).toBeVisible();
    expect(screen.queryByText("Ana Ruiz")).toBeNull();
  });
});
