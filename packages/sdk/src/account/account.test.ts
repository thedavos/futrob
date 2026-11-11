import { describe, expect, it } from "vite-plus/test";
import {
  accountDeletionAvailability,
  accountDeletionGate,
  authSessionListSchema,
  describeSessionDevice,
  emailChangeProblem,
  passwordChangeProblem,
  projectedAccountDeletionDate,
  toAccountSessions,
} from "./index.ts";

describe("session devices", () => {
  it.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      { kind: "desktop", client: "Chrome", os: "macOS" },
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      { kind: "phone", client: "Safari", os: "iOS" },
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0",
      { kind: "desktop", client: "Edge", os: "Windows" },
    ],
    ["okhttp/4.12.0", { kind: "app", client: "Futrob", os: null }],
    ["", { kind: "unknown", client: null, os: null }],
  ])("names %s", (agent, expected) => {
    expect(describeSessionDevice(agent)).toEqual(expected);
  });
});

describe("account sessions", () => {
  it("lists this session first and the rest by last activity", () => {
    const sessions = authSessionListSchema.parse([
      {
        id: "old",
        token: "t-old",
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-02T10:00:00.000Z",
        expiresAt: "2026-12-01T10:00:00.000Z",
        userAgent: "okhttp/4.12.0",
      },
      {
        id: "this",
        token: "t-this",
        createdAt: "2026-11-03T10:00:00.000Z",
        updatedAt: "2026-11-03T11:00:00.000Z",
        expiresAt: "2026-12-03T10:00:00.000Z",
        userAgent: null,
      },
      {
        id: "recent",
        token: "t-recent",
        createdAt: "2026-11-04T10:00:00.000Z",
        updatedAt: "2026-11-09T10:00:00.000Z",
        expiresAt: "2026-12-04T10:00:00.000Z",
      },
    ]);

    const listed = toAccountSessions(sessions, "this");

    expect(listed.map(({ id, current }) => ({ id, current }))).toEqual([
      { id: "this", current: true },
      { id: "recent", current: false },
      { id: "old", current: false },
    ]);
    expect(listed[2]?.device).toEqual({ kind: "app", client: "Futrob", os: null });
  });
});

describe("account form checks", () => {
  it("explains the first problem with a password change", () => {
    expect(
      passwordChangeProblem({ current: "", next: "newpassword", confirm: "newpassword" }),
    ).toBe("current-missing");
    expect(passwordChangeProblem({ current: "old", next: "short", confirm: "short" })).toBe(
      "too-short",
    );
    expect(passwordChangeProblem({ current: "old", next: "a".repeat(129), confirm: "" })).toBe(
      "too-long",
    );
    expect(passwordChangeProblem({ current: "old", next: "newpassword", confirm: "other" })).toBe(
      "mismatch",
    );
    expect(
      passwordChangeProblem({ current: "old", next: "newpassword", confirm: "newpassword" }),
    ).toBeNull();
  });

  it("rejects an invalid or unchanged email and accepts a new one", () => {
    expect(emailChangeProblem({ currentEmail: "a@x.test", newEmail: "not-an-email" })).toBe(
      "invalid",
    );
    expect(emailChangeProblem({ currentEmail: "a@x.test", newEmail: " A@X.test " })).toBe(
      "unchanged",
    );
    expect(emailChangeProblem({ currentEmail: "a@x.test", newEmail: "b@x.test" })).toBeNull();
  });
});

describe("account deletion", () => {
  const scheduled = {
    deletion: {
      status: "scheduled" as const,
      requestedAt: "2026-11-10T09:00:00.000Z",
      scheduledFor: "2026-12-10T09:00:00.000Z",
    },
    blockers: [],
  };
  const blocker = {
    kind: "sole-organizer" as const,
    organizationId: "org-1",
    organizationName: "Liga Norte",
  };

  it("lets a scheduled account see only its deletion date", () => {
    expect(accountDeletionGate(scheduled)).toEqual({
      kind: "scheduled",
      scheduledFor: new Date("2026-12-10T09:00:00.000Z"),
    });
    expect(accountDeletionGate({ deletion: { status: "active" }, blockers: [] })).toEqual({
      kind: "open",
    });
    expect(accountDeletionGate(undefined)).toEqual({ kind: "open" });
  });

  it("puts blockers before the request and keeps the server's date once scheduled", () => {
    expect(
      accountDeletionAvailability({ deletion: { status: "active" }, blockers: [blocker] }),
    ).toEqual({ kind: "blocked", blockers: [blocker] });
    expect(accountDeletionAvailability({ deletion: { status: "active" }, blockers: [] })).toEqual({
      kind: "available",
    });
    expect(accountDeletionAvailability(scheduled).kind).toBe("scheduled");
  });

  it("projects the deletion date thirty days after confirming", () => {
    expect(projectedAccountDeletionDate(new Date("2026-11-10T09:00:00.000Z"))).toEqual(
      new Date("2026-12-10T09:00:00.000Z"),
    );
  });
});
