import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { getFutrobClient } from "@/modules/api/futrob-client";
import {
  HOME_ROUTE,
  LOGIN_ROUTE,
  loadAuthenticatedShell,
  soleOrganizationId,
} from "./load-authenticated-shell.ts";
import { MOBILE_PERMISSION, SHELL_PERMISSIONS } from "./permissions.ts";
import {
  getSession,
  resetSessionCredentialStore,
  saveSession,
  setSessionCredentialStore,
} from "@/modules/identity/session-store";

function memoryCredentialStore() {
  const records = new Map<string, string>();
  return {
    setItemAsync: async (key: string, value: string) => {
      records.set(key, value);
    },
    getItemAsync: async (key: string) => records.get(key) ?? null,
    deleteItemAsync: async (key: string) => {
      records.delete(key);
    },
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pathnameOf(input: RequestInfo | URL): string {
  const href = input instanceof Request ? input.url : String(input);
  return new URL(href).pathname;
}

const SESSION = {
  token: "bearer-token-1",
  user: { id: "user-1", name: "Ana Captain", email: "ana@club.mx" },
};

const ONBOARDING_OK = {
  completed: true,
  completedAt: "2026-01-01T00:00:00.000Z",
  version: 1,
  path: "player",
  currentStep: null,
};

const MINE_OK = {
  memberships: [{ organizationId: "org-1", organizationName: "Club Lima", role: "organizer" }],
};

const ORG_PRIVILEGED = {
  organizationId: "org-privileged",
  organizationName: "Club Privileged",
  role: "organizer" as const,
};

const ORG_MEMBER = {
  organizationId: "org-member",
  organizationName: "Club Member",
  role: "member" as const,
};

const ACCESS_WITH_NEW_COMPETITION = {
  actorId: "actor-1",
  scope: { organizationId: "org-privileged" },
  roles: [{ scopeType: "organization", scopeId: "org-privileged", role: "organizer" }],
  permissions: [
    {
      permission: MOBILE_PERMISSION.organizationsRead,
      allowed: true,
      decidedAt: "organization",
    },
    {
      permission: MOBILE_PERMISSION.competitionsUpdate,
      allowed: true,
      decidedAt: "organization",
    },
  ],
};

const UNAUTHORIZED = { code: "api.unauthorized", messageKey: "errors.api.unauthorized" };
const FORBIDDEN = { code: "api.forbidden", messageKey: "errors.api.forbidden" };

describe("authenticated mobile shell", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(async () => {
    setSessionCredentialStore(memoryCredentialStore());
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    await saveSession(SESSION);
  });

  afterEach(() => {
    resetSessionCredentialStore();
    vi.unstubAllGlobals();
  });

  it("onboarding status 401 clears session and shows login", async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = pathnameOf(input);
      if (path.endsWith("/identity/onboarding")) {
        return jsonResponse(401, UNAUTHORIZED);
      }
      throw new Error(`unexpected ${path}`);
    });

    const snapshot = await loadAuthenticatedShell(getFutrobClient());

    expect(snapshot).toEqual({ kind: "login", destination: LOGIN_ROUTE });
    expect(snapshot.destination).not.toBe(HOME_ROUTE);
    await expect(getSession()).resolves.toBeNull();
  });

  it("memberships 401 clears session and shows login", async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = pathnameOf(input);
      if (path.endsWith("/identity/onboarding")) {
        return jsonResponse(200, ONBOARDING_OK);
      }
      if (path.endsWith("/organizations/mine")) {
        return jsonResponse(401, UNAUTHORIZED);
      }
      throw new Error(`unexpected ${path}`);
    });

    const snapshot = await loadAuthenticatedShell(getFutrobClient());

    expect(snapshot).toEqual({ kind: "login", destination: LOGIN_ROUTE });
    await expect(getSession()).resolves.toBeNull();
  });

  it("effective-access 401 clears session and shows login", async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = pathnameOf(input);
      if (path.endsWith("/identity/onboarding")) {
        return jsonResponse(200, ONBOARDING_OK);
      }
      if (path.endsWith("/organizations/mine")) {
        return jsonResponse(200, MINE_OK);
      }
      if (path.includes("/authorization/effective-access")) {
        return jsonResponse(401, UNAUTHORIZED);
      }
      throw new Error(`unexpected ${path}`);
    });

    const snapshot = await loadAuthenticatedShell(getFutrobClient());

    expect(snapshot).toEqual({ kind: "login", destination: LOGIN_ROUTE });
    await expect(getSession()).resolves.toBeNull();
  });

  it("effective-access 403 hides grants and offers retry", async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = pathnameOf(input);
      if (path.endsWith("/identity/onboarding")) {
        return jsonResponse(200, ONBOARDING_OK);
      }
      if (path.endsWith("/organizations/mine")) {
        return jsonResponse(200, MINE_OK);
      }
      if (path.includes("/authorization/effective-access")) {
        return jsonResponse(403, FORBIDDEN);
      }
      throw new Error(`unexpected ${path}`);
    });

    const snapshot = await loadAuthenticatedShell(getFutrobClient());

    expect(snapshot.kind).toBe("home");
    if (snapshot.kind !== "home") return;
    expect(snapshot.destination).toBe(HOME_ROUTE);
    expect(snapshot.capability).toEqual({ status: "unavailable" });
    expect(snapshot.nav).toEqual([]);
    expect(snapshot.commands).toEqual([]);
    expect(snapshot.accessRetryable).toBe(true);
    expect(snapshot.nav.map((item) => item.id)).not.toContain("home");
    expect(snapshot.commands.map((item) => item.id)).not.toContain("new-competition");
    await expect(getSession()).resolves.toEqual(SESSION);

    const requested = fetchMock.mock.calls.map(([input]) => pathnameOf(input));
    expect(requested.some((path) => path.includes("/authorization/effective-access"))).toBe(true);
    const accessCall = fetchMock.mock.calls.find(([input]) =>
      pathnameOf(input).includes("/authorization/effective-access"),
    );
    const accessUrl = String(accessCall?.[0]);
    for (const permission of SHELL_PERMISSIONS) {
      expect(accessUrl).toContain(permission);
    }
    expect(accessUrl).toContain("organizationId=org-1");
  });

  it("ready access shows grant-gated org commands", async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = pathnameOf(input);
      if (path.endsWith("/identity/onboarding")) {
        return jsonResponse(200, ONBOARDING_OK);
      }
      if (path.endsWith("/organizations/mine")) {
        return jsonResponse(200, MINE_OK);
      }
      if (path.includes("/authorization/effective-access")) {
        return jsonResponse(200, {
          actorId: "actor-1",
          scope: { organizationId: "org-1" },
          roles: [{ scopeType: "organization", scopeId: "org-1", role: "organizer" }],
          permissions: [
            {
              permission: MOBILE_PERMISSION.organizationsRead,
              allowed: true,
              decidedAt: "organization",
            },
            {
              permission: MOBILE_PERMISSION.competitionsUpdate,
              allowed: true,
              decidedAt: "organization",
            },
          ],
        });
      }
      throw new Error(`unexpected ${path}`);
    });

    const snapshot = await loadAuthenticatedShell(getFutrobClient());
    expect(snapshot.kind).toBe("home");
    if (snapshot.kind !== "home") return;
    expect(snapshot.nav.map((item) => item.id)).toEqual(["home"]);
    expect(snapshot.commands).toEqual([{ id: "new-competition", label: "Nueva competición" }]);
    expect(snapshot.accessRetryable).toBe(false);
  });

  it("zero memberships stay on the personal catalog", async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = pathnameOf(input);
      if (path.endsWith("/identity/onboarding")) {
        return jsonResponse(200, ONBOARDING_OK);
      }
      if (path.endsWith("/organizations/mine")) {
        return jsonResponse(200, { memberships: [] });
      }
      if (path.includes("/authorization/effective-access")) {
        return jsonResponse(200, {
          actorId: "actor-1",
          scope: {},
          roles: [],
          permissions: [
            {
              permission: MOBILE_PERMISSION.competitionsUpdate,
              allowed: true,
              decidedAt: "platform",
            },
          ],
        });
      }
      throw new Error(`unexpected ${path}`);
    });

    const snapshot = await loadAuthenticatedShell(getFutrobClient());
    expect(snapshot.kind).toBe("home");
    if (snapshot.kind !== "home") return;
    expect(snapshot.organizationId).toBeUndefined();
    expect(snapshot.nav).toEqual([{ id: "home", label: "Inicio" }]);
    expect(snapshot.commands).toEqual([]);
  });

  it("two memberships with different grants hide org commands until an explicit selection exists", async () => {
    const orders = [
      [ORG_PRIVILEGED, ORG_MEMBER],
      [ORG_MEMBER, ORG_PRIVILEGED],
    ];

    for (const memberships of orders) {
      fetchMock.mockReset();
      fetchMock.mockImplementation(async (input) => {
        const path = pathnameOf(input);
        if (path.endsWith("/identity/onboarding")) {
          return jsonResponse(200, ONBOARDING_OK);
        }
        if (path.endsWith("/organizations/mine")) {
          return jsonResponse(200, { memberships });
        }
        if (path.includes("/authorization/effective-access")) {
          return jsonResponse(200, ACCESS_WITH_NEW_COMPETITION);
        }
        throw new Error(`unexpected ${path}`);
      });

      const snapshot = await loadAuthenticatedShell(getFutrobClient());
      expect(snapshot.kind).toBe("home");
      if (snapshot.kind !== "home") return;
      expect(snapshot.organizationId).toBeUndefined();
      expect(snapshot.nav).toEqual([{ id: "home", label: "Inicio" }]);
      expect(snapshot.commands).toEqual([]);
      expect(snapshot.commands.map((command) => command.id)).not.toContain("new-competition");

      const accessCall = fetchMock.mock.calls.find(([input]) =>
        pathnameOf(input).includes("/authorization/effective-access"),
      );
      const accessUrl = String(accessCall?.[0]);
      expect(accessUrl).not.toContain("organizationId=org-privileged");
      expect(accessUrl).not.toContain("organizationId=org-member");
    }
  });
});

describe("soleOrganizationId", () => {
  it("uses the only membership and ignores order when there are two", () => {
    expect(soleOrganizationId([])).toBeUndefined();
    expect(soleOrganizationId([ORG_PRIVILEGED])).toBe("org-privileged");
    expect(soleOrganizationId([ORG_PRIVILEGED, ORG_MEMBER])).toBeUndefined();
    expect(soleOrganizationId([ORG_MEMBER, ORG_PRIVILEGED])).toBeUndefined();
  });
});
