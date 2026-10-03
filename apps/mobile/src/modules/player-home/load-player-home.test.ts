import { createFutrobClient, FutrobApiError } from "@futrob/sdk";
import { mockFetch, requestUrl } from "@futrob/sdk/testing";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  getSession,
  resetSessionCredentialStore,
  saveSession,
  setSessionCredentialStore,
} from "@/modules/identity/session-store";
import {
  emptyOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/modules/identity/onboarding-draft";
import { loadPlayerHome } from "./load-player-home";
import { lastMatch, snapshot } from "./player-home.fixtures";
import { resolvePlayerHome } from "./player-home-model";

const sources = {
  "/players/me": "profile",
  "/players/me/recent-matches": "recentMatches",
  "/players/me/game-profile": "gameProfile",
  "/competitions/mine": "competitions",
  "/players/me/next-encounter": "nextEncounter",
  "/players/me/roster-invitations": "invitations",
} as const;
type Path = keyof typeof sources;

function response(path: string, data = snapshot()): Response {
  const source = sources[path as Path];
  if (!source) throw new Error(`Unexpected test route ${path}`);
  const result = data[source];
  if (result.kind !== "ready") throw new Error("Transport fixture must contain a DTO");
  return Response.json(result.data);
}

function apiError(status: number, retryAfterSeconds?: number): Response {
  return Response.json(
    {
      code: "api.unavailable",
      messageKey: "errors.api.unavailable",
      requestId: "8ef98de4-a8ab-4e88-a864-b36857421667",
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    },
    { status },
  );
}

function transport(handler?: (path: string, init?: RequestInit) => Response | Promise<Response>) {
  return mockFetch((input, init) => {
    const path = new URL(requestUrl(input)).pathname.replace("/api/v1", "");
    return handler ? handler(path, init) : response(path);
  });
}

function client(fetchImpl = transport(), timeoutMs?: number) {
  return createFutrobClient({ baseUrl: "https://app.example.com/api/v1", fetchImpl, timeoutMs });
}

afterEach(() => {
  resetSessionCredentialStore();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("loadPlayerHome", () => {
  it("returns all six parsed sources with their concrete server data", async () => {
    const loaded = await loadPlayerHome({ externalClubId: "club-cuervos", client: client() });

    expect(loaded).toEqual(snapshot());
    expect(resolvePlayerHome(loaded)).toMatchObject({
      kind: "dashboard",
      selectedClub: { externalClubId: "club-cuervos", externalClubName: "Cuervos FC1" },
      hero: {
        kind: "next-encounter",
        encounter: {
          home: { name: "Cuervos FC1" },
          away: { name: "MADERAS FC" },
          competition: { timeZone: "America/Lima" },
          scheduledStartAt: "2026-10-02T02:00:00.000Z",
        },
      },
      invitations: { kind: "pending", count: 1 },
      performance: { kind: "stats", profile: { summary: { matchesPlayed: 1, minutes: 12 } } },
      bottomLeft: { kind: "last-match", last: { match: { id: "match-1" } } },
    });
  });

  it.each([
    ["/players/me/next-encounter", "/players/me/roster-invitations"],
    ["/players/me/roster-invitations", "/players/me/next-encounter"],
  ])("keeps the same result when %s finishes before %s", async (first, second) => {
    const pending = new Map([
      [first, Promise.withResolvers<Response>()],
      [second, Promise.withResolvers<Response>()],
    ]);
    const loaded = loadPlayerHome({
      externalClubId: "club-cuervos",
      client: client(transport((path) => pending.get(path)?.promise ?? response(path))),
    });
    pending.get(first)?.resolve(response(first));
    await Promise.resolve();
    pending.get(second)?.resolve(response(second));

    await expect(loaded).resolves.toEqual(snapshot());
  });

  it("starts independent requests while the player profile is still pending", async () => {
    const pendingProfile = Promise.withResolvers<Response>();
    const otherResponses = Promise.withResolvers<void>();
    const completed: string[] = [];
    const loaded = loadPlayerHome({
      externalClubId: "club-cuervos",
      client: client(
        transport((path) => {
          if (path === "/players/me") return pendingProfile.promise;
          completed.push(path);
          if (completed.length === 5) otherResponses.resolve();
          return response(path);
        }),
      ),
    });
    await otherResponses.promise;
    expect(completed).toHaveLength(5);
    pendingProfile.resolve(response("/players/me"));
    await expect(loaded).resolves.toEqual(snapshot());
  });

  it("filters both provider reads and keeps separate results for two selected clubs", async () => {
    const fetchImpl = mockFetch((input) => {
      const url = new URL(requestUrl(input));
      const path = url.pathname.replace("/api/v1", "");
      const id = url.searchParams.get("externalClubId");
      if (path === "/players/me/recent-matches") {
        return Response.json({
          status: "ready",
          matches: [{ ...lastMatch, listedExternalClubId: id }],
        });
      }
      if (path === "/players/me/game-profile") {
        const data = snapshot().gameProfile;
        if (data.kind !== "ready" || data.data.status !== "ready") throw new Error("Fixture");
        return Response.json({
          status: "ready",
          profile: {
            ...data.data.profile,
            identity: { ...data.data.profile.identity, displayName: id },
          },
        });
      }
      return response(path);
    });
    const requests: string[] = [];
    const filteredClient = client(
      mockFetch((input, init) => {
        requests.push(requestUrl(input));
        return fetchImpl(input, init);
      }),
    );
    const [cuervos, maderas] = await Promise.all([
      loadPlayerHome({ client: filteredClient, externalClubId: "club-cuervos" }),
      loadPlayerHome({ client: filteredClient, externalClubId: "club-maderas" }),
    ]);

    expect(cuervos).toMatchObject({
      externalClubId: "club-cuervos",
      recentMatches: {
        kind: "ready",
        data: { status: "ready", matches: [{ listedExternalClubId: "club-cuervos" }] },
      },
      gameProfile: {
        kind: "ready",
        data: { profile: { identity: { displayName: "club-cuervos" } } },
      },
    });
    expect(maderas).toMatchObject({
      externalClubId: "club-maderas",
      recentMatches: {
        kind: "ready",
        data: { status: "ready", matches: [{ listedExternalClubId: "club-maderas" }] },
      },
      gameProfile: {
        kind: "ready",
        data: { profile: { identity: { displayName: "club-maderas" } } },
      },
    });
    expect(resolvePlayerHome(maderas).selectedClub?.externalClubName).toBe("MADERAS FC");
    for (const id of ["club-cuervos", "club-maderas"]) {
      expect(requests).toContain(
        `https://app.example.com/api/v1/players/me/recent-matches?externalClubId=${id}`,
      );
      expect(requests).toContain(
        `https://app.example.com/api/v1/players/me/game-profile?externalClubId=${id}`,
      );
    }
  });

  it("preserves unfiltered responses without attributing them to the first associated club", async () => {
    const requests: string[] = [];
    const loaded = await loadPlayerHome({
      client: client(
        mockFetch((input) => {
          requests.push(requestUrl(input));
          return response(new URL(requestUrl(input)).pathname.replace("/api/v1", ""));
        }),
      ),
    });
    expect(loaded).toEqual(snapshot({ externalClubId: undefined }));
    expect(resolvePlayerHome(loaded)).toMatchObject({
      kind: "select-club",
      selectedClub: null,
      performance: { kind: "onboarding" },
    });
    expect(requests).toContain("https://app.example.com/api/v1/players/me/recent-matches");
    expect(requests).toContain("https://app.example.com/api/v1/players/me/game-profile");
  });

  it("uses the SDK's canonical club ID for both provider queries and the returned context", async () => {
    const requests: string[] = [];
    const loaded = await loadPlayerHome({
      externalClubId: " club-cuervos ",
      client: client(
        mockFetch((input) => {
          requests.push(requestUrl(input));
          return response(new URL(requestUrl(input)).pathname.replace("/api/v1", ""));
        }),
      ),
    });
    expect(loaded).toEqual(snapshot());
    expect(resolvePlayerHome(loaded)).toMatchObject({
      kind: "dashboard",
      selectedClub: { externalClubId: "club-cuervos" },
      bottomLeft: { kind: "last-match", last: { listedExternalClubId: "club-cuervos" } },
      performance: { kind: "stats", profile: { identity: { displayName: "davos282" } } },
    });
    expect(requests).toContain(
      "https://app.example.com/api/v1/players/me/recent-matches?externalClubId=club-cuervos",
    );
    expect(requests).toContain(
      "https://app.example.com/api/v1/players/me/game-profile?externalClubId=club-cuervos",
    );
  });

  it.each(["needs_club", "needs_game_account"] as const)(
    "retains provider status %s",
    async (status) => {
      const loaded = await loadPlayerHome({
        externalClubId: "club-cuervos",
        client: client(
          transport((path) =>
            path === "/players/me/recent-matches" || path === "/players/me/game-profile"
              ? Response.json({ status })
              : response(path),
          ),
        ),
      });
      expect(loaded.recentMatches).toEqual({ kind: "ready", data: { status } });
      expect(loaded.gameProfile).toEqual({ kind: "ready", data: { status } });
      expect(resolvePlayerHome(loaded).performance).toEqual({
        kind: status === "needs_club" ? "needs-club" : "needs-game-account",
      });
    },
  );

  it.each([503, 429])("keeps other sources when recent matches returns HTTP %i", async (status) => {
    const loaded = await loadPlayerHome({
      externalClubId: "club-cuervos",
      client: client(
        transport((path) =>
          path === "/players/me/recent-matches" ? apiError(status, 30) : response(path),
        ),
      ),
    });
    expect(loaded.recentMatches).toEqual({
      kind: "error",
      error: {
        kind: "api",
        status,
        code: "api.unavailable",
        messageKey: "errors.api.unavailable",
        requestId: "8ef98de4-a8ab-4e88-a864-b36857421667",
        retryAfterSeconds: 30,
      },
    });
    expect(loaded.nextEncounter).toEqual(snapshot().nextEncounter);
    expect(loaded.gameProfile).toEqual(snapshot().gameProfile);
    expect(resolvePlayerHome(loaded)).toMatchObject({
      hero: { kind: "next-encounter", encounter: { encounterId: "encounter-1" } },
      bottomLeft: { kind: "error", error: { status } },
      performance: { kind: "error", error: { status } },
    });
  });

  it("keeps forbidden competitions as an error rather than no competitions", async () => {
    const loaded = await loadPlayerHome({
      externalClubId: "club-cuervos",
      client: client(
        transport((path) => (path === "/competitions/mine" ? apiError(403) : response(path))),
      ),
    });
    expect(resolvePlayerHome(loaded)).toMatchObject({
      hero: { kind: "error", error: { kind: "api", status: 403 } },
      bottomRight: { kind: "error", error: { kind: "api", status: 403 } },
      bottomLeft: { kind: "last-match" },
    });
  });

  it("retains a failed profile instead of treating it as onboarding", async () => {
    const loaded = await loadPlayerHome({
      externalClubId: "club-cuervos",
      client: client(
        transport((path) => (path === "/players/me" ? apiError(503) : response(path))),
      ),
    });
    expect(resolvePlayerHome(loaded)).toMatchObject({
      kind: "error",
      eaCard: { kind: "error", error: { status: 503 } },
      invitations: { kind: "pending", count: 1 },
    });
    expect(loaded.recentMatches).toEqual(snapshot().recentMatches);
    expect(loaded.nextEncounter).toEqual(snapshot().nextEncounter);
  });

  it("keeps validation errors for an unknown club and never substitutes another selection", async () => {
    const loaded = await loadPlayerHome({
      externalClubId: "club-unknown",
      client: client(
        transport((path) =>
          path === "/players/me/recent-matches" || path === "/players/me/game-profile"
            ? apiError(400)
            : response(path),
        ),
      ),
    });
    expect(loaded).toMatchObject({
      externalClubId: "club-unknown",
      recentMatches: { kind: "error", error: { kind: "api", status: 400 } },
      gameProfile: { kind: "error", error: { kind: "api", status: 400 } },
    });
    expect(resolvePlayerHome(loaded)).toMatchObject({ kind: "invalid-club", selectedClub: null });
  });

  it("classifies an incompatible DTO as a contract error", async () => {
    const loaded = await loadPlayerHome({
      client: client(
        transport((path) =>
          path === "/players/me/game-profile"
            ? Response.json({ status: "ready", profile: {} })
            : response(path),
        ),
      ),
    });
    expect(loaded.gameProfile).toEqual({ kind: "error", error: { kind: "contract" } });
    expect(loaded.recentMatches).toEqual(snapshot().recentMatches);
  });

  it("classifies network failures without inventing an API failure", async () => {
    const loaded = await loadPlayerHome({
      client: client(
        transport((path) => {
          if (path === "/players/me/game-profile") throw new TypeError("Failed to fetch");
          return response(path);
        }),
      ),
    });
    expect(loaded.gameProfile).toEqual({ kind: "error", error: { kind: "network" } });
    expect(loaded.invitations).toEqual(snapshot().invitations);
  });

  it("retains an SDK timeout independently of the successful sources", async () => {
    vi.useFakeTimers();
    const loaded = loadPlayerHome({
      client: client(
        transport((path, init) => {
          if (path !== "/players/me/game-profile") return response(path);
          return new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
              once: true,
            });
          });
        }),
        50,
      ),
    });
    await vi.advanceTimersByTimeAsync(50);
    const result = await loaded;
    expect(result.gameProfile).toEqual({
      kind: "error",
      error: { kind: "timeout", timeoutMs: 50 },
    });
    expect(result.nextEncounter).toEqual(snapshot().nextEncounter);
  });

  it.each(Object.keys(sources) as Path[])(
    "rejects the whole load and clears the mobile session on 401 from %s",
    async (unauthorizedPath) => {
      const records = new Map<string, string>();
      setSessionCredentialStore({
        getItemAsync: async (key) => records.get(key) ?? null,
        setItemAsync: async (key, value) => {
          records.set(key, value);
        },
        deleteItemAsync: async (key) => {
          records.delete(key);
        },
      });
      const session = {
        token: "bearer-1",
        user: { id: "user-1", name: "Ana", email: "ana@example.com" },
      };
      await saveSession(session);
      await saveOnboardingDraft("user-1", {
        ...emptyOnboardingDraft(),
        organizationName: "Draft club",
      });
      await expect(getSession()).resolves.toEqual(session);
      vi.stubGlobal(
        "fetch",
        transport((path) => (path === unauthorizedPath ? apiError(401) : response(path))),
      );

      await expect(loadPlayerHome({ externalClubId: "club-cuervos" })).rejects.toMatchObject({
        status: 401,
      });
      await expect(getSession()).resolves.toBeNull();
      await expect(loadOnboardingDraft("user-1")).resolves.toMatchObject({ organizationName: "" });
    },
  );

  it("propagates the SDK's unauthorized error for an injected client", async () => {
    const loaded = loadPlayerHome({ client: client(transport(() => apiError(401))) });
    await expect(loaded).rejects.toBeInstanceOf(FutrobApiError);
    await expect(loaded).rejects.toMatchObject({ status: 401, code: "api.unavailable" });
  });

  it("rejects a 401 immediately even while another source is still pending", async () => {
    const pending = Promise.withResolvers<Response>();
    const loaded = loadPlayerHome({
      client: client(
        transport((path) => {
          if (path === "/players/me/next-encounter") return pending.promise;
          return path === "/players/me" ? apiError(401) : response(path);
        }),
      ),
    });
    await expect(loaded).rejects.toMatchObject({ status: 401, code: "api.unavailable" });
    pending.resolve(response("/players/me/next-encounter"));
  });

  it("rejects an already aborted signal before starting any request", async () => {
    const controller = new AbortController();
    controller.abort(new Error("Cancelled before load"));
    const fetchImpl =
      vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(transport());
    await expect(
      loadPlayerHome({ client: client(fetchImpl), signal: controller.signal }),
    ).rejects.toThrow("Cancelled before load");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("provides an AbortError when the caller aborts with a non-error reason", async () => {
    const controller = new AbortController();
    controller.abort("cancelled");
    await expect(
      loadPlayerHome({ client: client(), signal: controller.signal }),
    ).rejects.toMatchObject({
      name: "AbortError",
      message: "Player home load aborted",
    });
  });

  it("rejects in-flight cancellation even if the transport ignores it; later loads still succeed", async () => {
    const controller = new AbortController();
    const started = Promise.withResolvers<void>();
    const pending = Promise.withResolvers<Response>();
    const signals: (AbortSignal | null | undefined)[] = [];
    const loaded = loadPlayerHome({
      client: client(
        transport((path, init) => {
          signals.push(init?.signal);
          if (signals.length === 6) started.resolve();
          return path === "/players/me/next-encounter" ? pending.promise : response(path);
        }),
      ),
      signal: controller.signal,
    });
    const rejection = expect(loaded).rejects.toThrow("Cancelled in flight");
    await started.promise;
    controller.abort(new Error("Cancelled in flight"));
    await rejection;
    expect(signals.every((signal) => signal?.aborted)).toBe(true);
    pending.resolve(response("/players/me/next-encounter"));
    await expect(
      loadPlayerHome({ client: client(), externalClubId: "club-cuervos" }),
    ).resolves.toEqual(snapshot());
  });
});
