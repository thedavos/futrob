import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

export interface ProviderMatchTeam {
  readonly externalClubId: string;
  readonly name: string;
  readonly goals: number;
}

export interface ProviderPlayerMatchStats {
  readonly externalPlayerId: string;
  readonly displayName: string;
  readonly goals: number | null;
  readonly assists: number | null;
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
