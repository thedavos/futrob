import { getMyRecentMatchesQuerySchema } from "@futrob/api-contracts";
import { FutrobApiError, FutrobRequestTimeoutError, type FutrobClient } from "@futrob/sdk";
import { z } from "zod";
import { getFutrobClient } from "@/modules/api/futrob-client";
import type { PlayerHomeFailure, PlayerHomeSnapshot, PlayerHomeSource } from "./player-home-model";

export interface LoadPlayerHomeInput {
  externalClubId?: string;
  signal?: AbortSignal;
  client?: FutrobClient;
}

/** Six independent reads. Unauthorized access and cancellation reject the whole load. */
export async function loadPlayerHome({
  externalClubId,
  signal,
  client = getFutrobClient(),
}: LoadPlayerHomeInput = {}): Promise<PlayerHomeSnapshot> {
  if (signal?.aborted) throw cancellationReason(signal);
  const query = getMyRecentMatchesQuerySchema.parse(
    externalClubId === undefined ? {} : { externalClubId },
  );
  const options = { signal };

  async function read<T>(request: Promise<T>): Promise<PlayerHomeSource<T>> {
    try {
      return { kind: "ready", data: await request };
    } catch (error) {
      if (signal?.aborted) throw cancellationReason(signal);
      if (error instanceof FutrobApiError && error.status === 401) throw error;
      let failure: PlayerHomeFailure;
      if (error instanceof FutrobApiError) {
        failure = {
          kind: "api",
          status: error.status,
          code: error.code,
          messageKey: error.messageKey,
          requestId: error.requestId,
          retryAfterSeconds: error.retryAfterSeconds,
        };
      } else if (error instanceof FutrobRequestTimeoutError) {
        failure = { kind: "timeout", timeoutMs: error.timeoutMs };
      } else if (error instanceof z.ZodError) {
        failure = { kind: "contract" };
      } else {
        failure = { kind: "network" };
      }
      return { kind: "error", error: failure };
    }
  }

  // Race the aggregate as well: cancellation must settle even if a transport ignores the signal.
  let onAbort: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    if (signal) {
      onAbort = () => reject(cancellationReason(signal));
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
  try {
    const requests = Promise.all([
      read(client.players.getProfile(options)),
      read(client.statistics.getMyRecentMatches(query, options)),
      read(client.statistics.getMyGameProfile(query, options)),
      read(client.competitions.listMine(options)),
      read(client.players.getNextEncounter(options)),
      read(client.teams.rosterInvitations.listMine(options)),
    ]);
    const [profile, recentMatches, gameProfile, competitions, nextEncounter, invitations] =
      await Promise.race([requests, cancelled]);
    if (signal?.aborted) throw cancellationReason(signal);
    return {
      externalClubId: query.externalClubId,
      profile,
      recentMatches,
      gameProfile,
      competitions,
      nextEncounter,
      invitations,
    };
  } finally {
    if (signal && onAbort) signal.removeEventListener("abort", onAbort);
  }
}

function cancellationReason(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error("Player home load aborted");
  error.name = "AbortError";
  return error;
}
