import type { ExternalReference, ProviderMatch } from "@futrob/game-data";
import type { EncounterId, TeamId } from "@futrob/shared-kernel";
import type { CandidateWindow } from "../policies/candidate-window.ts";

export interface CandidateMatchQuery {
  readonly encounterId: EncounterId;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly window: CandidateWindow;
}

export type CandidateMatchReadResult =
  | {
      readonly status: "ready";
      readonly matches: readonly ProviderMatch[];
    }
  | {
      readonly status: "clubs_not_connected";
      readonly sides: readonly ("home" | "away")[];
    }
  | {
      readonly status: "provider_mismatch";
    };

export interface ProviderMatchReaderPort {
  listCandidatesForEncounter(input: CandidateMatchQuery): Promise<CandidateMatchReadResult>;
  getByExternalRef(ref: ExternalReference): Promise<ProviderMatch | null>;
}
