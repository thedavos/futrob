import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

export interface ProviderMatchTeam {
  readonly externalClubId: string;
  readonly name: string;
  readonly goals: number;
}

/**
 * Per-player observation from a provider match.
 * `null` means the field was absent or unknown in the payload.
 * A real zero is represented as `0` / `false`, never collapsed into `null`.
 */
export interface ProviderPlayerMatchStats {
  readonly externalPlayerId: string;
  readonly displayName: string;
  readonly externalClubId: string;
  readonly position: string | null;
  readonly minutesPlayed: number | null;
  readonly goals: number | null;
  readonly assists: number | null;
  readonly shots: number | null;
  readonly passAttempts: number | null;
  readonly passesMade: number | null;
  readonly tackleAttempts: number | null;
  readonly tacklesMade: number | null;
  readonly saves: number | null;
  readonly yellowCards: number | null;
  readonly redCards: number | null;
  readonly isMvp: boolean | null;
  readonly rating: number | null;
}

export interface ProviderMatch {
  readonly id: string;
  readonly provider: {
    readonly key: GameDataProviderKey;
    readonly externalMatchId: string;
  };
  readonly game: {
    readonly edition: string;
    readonly platform: string;
    readonly mode: string;
  };
  readonly occurredAt: Date;
  readonly home: ProviderMatchTeam;
  readonly away: ProviderMatchTeam;
  readonly players: readonly ProviderPlayerMatchStats[];
  readonly metadata: {
    readonly durationSeconds: number | null;
    readonly wasDisconnected: boolean;
    readonly winnerByForfeit: boolean;
    readonly completeness: "complete" | "partial" | "unknown";
  };
}
