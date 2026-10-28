import { useQuery } from "@tanstack/react-query";
import type { GameDataProviderKeyQuery } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { providerHealthBrowserClient } from "./provider-health-browser-client.ts";

export function useProviderHealthQuery(
  providerKey: GameDataProviderKeyQuery,
  options: { readonly enabled: boolean },
) {
  return useQuery({
    queryKey: queryKeys.gameData.providerHealth(providerKey),
    queryFn: async ({ signal }) => {
      const result = await providerHealthBrowserClient.get(providerKey, { signal });
      if (!result.isOk()) throw result.error;
      return result.value;
    },
    enabled: options.enabled,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
