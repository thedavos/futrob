import { useMutation, useQuery } from "@tanstack/react-query";
import type { GetClubQueryInput, SearchClubsQueryInput } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { gameDataBrowserClient } from "./game-data-browser-client.ts";

export function useSearchClubsMutation() {
  return useMutation({
    mutationFn: async (input: SearchClubsQueryInput) => {
      const result = await gameDataBrowserClient.searchClubs(input);
      if (!result.isOk()) {
        throw result.error;
      }
      return result.value;
    },
  });
}

export function useClubQuery(
  externalClubId: string | null | undefined,
  input: GetClubQueryInput,
  options?: { readonly enabled?: boolean },
) {
  const id = externalClubId?.trim() ?? "";
  const providerKey = input.providerKey ?? "ea-clubs";
  const platform = input.platform ?? "common-gen5";
  const gameEdition = input.gameEdition ?? "fc26";

  return useQuery({
    queryKey: queryKeys.gameData.club({
      externalClubId: id,
      providerKey,
      platform,
      gameEdition,
    }),
    queryFn: async () => {
      const result = await gameDataBrowserClient.getClub(id, {
        providerKey,
        platform,
        gameEdition,
      });
      if (!result.isOk()) {
        throw result.error;
      }
      return result.value;
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}
