import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  acceptRosterInvitationLink,
  clearPendingRosterInvitation,
  pendingRosterInvitation,
} from "./roster-invitation-link";

const mocks = vi.hoisted(() => ({ gate: vi.fn(), accept: vi.fn() }));
vi.mock("./session-gate", () => ({ resolveSessionGate: mocks.gate }));
vi.mock("@/modules/api/futrob-client", () => ({
  getFutrobClient: () => ({ teams: { rosterInvitations: { accept: mocks.accept } } }),
}));

afterEach(async () => {
  await clearPendingRosterInvitation();
  vi.resetAllMocks();
});

describe("roster invitation link", () => {
  it("preserves the token while login or onboarding is required", async () => {
    mocks.gate.mockResolvedValue({ kind: "login", route: "/(auth)/login" });
    expect(await acceptRosterInvitationLink("roster-token")).toBe("/(auth)/login");
    expect(await pendingRosterInvitation()).toBe("roster-token");
    expect(mocks.accept).not.toHaveBeenCalled();
  });
  it("accepts through the roster SDK and clears the pending token", async () => {
    mocks.gate.mockResolvedValue({ kind: "ready" });
    mocks.accept.mockResolvedValue({});
    expect(await acceptRosterInvitationLink("roster-token")).toBe("/player");
    expect(mocks.accept).toHaveBeenCalledWith({ token: "roster-token" });
    expect(await pendingRosterInvitation()).toBeNull();
  });
  it("keeps the token on failure for retry", async () => {
    mocks.gate.mockResolvedValue({ kind: "ready" });
    mocks.accept.mockRejectedValue(new Error("offline"));
    await expect(acceptRosterInvitationLink("roster-token")).rejects.toThrow();
    expect(await pendingRosterInvitation()).toBe("roster-token");
  });
});
