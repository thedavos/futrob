import type {
  GetMyMatchesResponse,
  GetMyRecentMatchesResponse,
  GetMyStatisticsResponse,
  RequestId,
} from "@futrob/api-contracts";

/** Storybook-only client. Production code keeps `statistics-browser-client.ts`. */
export class StatisticsClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "StatisticsClientError";
  }
}

export type PlayerMatchesStoryState = {
  readonly recent: "pending" | "error" | GetMyRecentMatchesResponse;
};

const hang = <T>(): Promise<T> => new Promise(() => undefined);

let state: PlayerMatchesStoryState = {
  recent: { status: "needs_club" },
};

export function configurePlayerMatchesStory(next: PlayerMatchesStoryState): void {
  state = next;
}

export const statisticsBrowserClient = {
  getMyStatistics(): Promise<GetMyStatisticsResponse> {
    return Promise.resolve({ statistics: null });
  },

  getMyMatches(): Promise<GetMyMatchesResponse> {
    return Promise.resolve({ matches: [], nextCursor: null });
  },

  getMyRecentMatches(_query?: {
    readonly externalClubId?: string;
  }): Promise<GetMyRecentMatchesResponse> {
    const recent = state.recent;
    if (recent === "pending") return hang();
    if (recent === "error") {
      return Promise.reject(new StatisticsClientError(503, "game_data.unavailable"));
    }
    return Promise.resolve(recent);
  },
};
