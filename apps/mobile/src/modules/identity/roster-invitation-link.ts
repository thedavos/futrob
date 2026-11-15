import * as SecureStore from "expo-secure-store";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { resolveSessionGate } from "./session-gate";

const KEY = "futrob.pending-roster-invitation";

export async function pendingRosterInvitation(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function clearPendingRosterInvitation(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export async function acceptRosterInvitationLink(token: string): Promise<string> {
  if (!token.trim()) throw new Error("Missing invitation token");
  await SecureStore.setItemAsync(KEY, token);
  const gate = await resolveSessionGate();
  if (gate.kind === "error") throw new Error("Session unavailable");
  if (gate.kind !== "ready") return gate.route;
  await getFutrobClient().teams.rosterInvitations.accept({ token });
  await clearPendingRosterInvitation();
  return "/player";
}
