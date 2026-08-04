import { useMutation } from "@tanstack/react-query";
import type { SearchClubsQueryInput } from "@futrob/api-contracts";
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
