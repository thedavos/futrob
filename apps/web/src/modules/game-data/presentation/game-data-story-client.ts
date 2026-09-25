import type {
  ExternalClubDto,
  GetClubQueryInput,
  GetClubResponse,
  RequestId,
  SearchClubsQueryInput,
  SearchClubsResponse,
} from "@futrob/api-contracts";
import { EA_SEARCH_PLATFORM } from "@futrob/api-contracts";
import { err, ok, TaggedError, type Result } from "@futrob/shared-kernel";

/** Storybook-only client. Production code keeps `game-data-browser-client.ts`. */
export class GameDataClientError extends TaggedError("GameDataClientError")<{
  code: string;
  message: string;
  requestId?: RequestId;
  retryAfterSeconds?: number;
  status: number;
}> {}

const FC26_CREST_FERA =
  "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png";

const STORY_CLUBS: readonly ExternalClubDto[] = [
  {
    providerKey: "ea-clubs",
    externalClubId: "22110",
    name: "Fera Enjaulada",
    platform: EA_SEARCH_PLATFORM.CROSS_GEN,
    gameEdition: "fc26",
    imageUrl: FC26_CREST_FERA,
  },
  {
    providerKey: "ea-clubs",
    externalClubId: "10754",
    name: "Fera Night Owls",
    platform: EA_SEARCH_PLATFORM.CROSS_GEN,
    gameEdition: "fc26",
    imageUrl: null,
  },
  {
    providerKey: "ea-clubs",
    externalClubId: "33021",
    name: "Fera Barranco",
    platform: EA_SEARCH_PLATFORM.CROSS_GEN,
    gameEdition: "fc26",
    imageUrl: null,
  },
];

function notFound(message: string): GameDataClientError {
  return new GameDataClientError({
    code: "game_data.club_not_found",
    message,
    status: 404,
  });
}

function matchingStoryClubs(query: string): readonly ExternalClubDto[] {
  const needle = query.trim().toLowerCase();
  return STORY_CLUBS.filter((club) => club.name.toLowerCase().includes(needle));
}

export async function searchStoryExternalClubs(input: {
  readonly query: string;
}): Promise<readonly ExternalClubDto[]> {
  return matchingStoryClubs(input.query);
}

export const gameDataBrowserClient = {
  async searchClubs(
    input: SearchClubsQueryInput,
  ): Promise<Result<SearchClubsResponse, GameDataClientError>> {
    return ok({ clubs: [...matchingStoryClubs(input.query)] });
  },

  async getClub(
    externalClubId: string,
    _input: GetClubQueryInput = {},
  ): Promise<Result<GetClubResponse, GameDataClientError>> {
    const club = STORY_CLUBS.find((item) => item.externalClubId === externalClubId);
    if (!club) return err(notFound(`Unknown club ${externalClubId}`));
    return ok(club);
  },
};
