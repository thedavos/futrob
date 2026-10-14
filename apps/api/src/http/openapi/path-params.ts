import { gameDataProviderKeyQuerySchema } from "@futrob/api-contracts";
import { z } from "zod";

export function pathParams(names: readonly string[]) {
  return z.object(Object.fromEntries(names.map((name) => [name, z.string()])));
}

export const providerKeyPathParams = z.object({
  providerKey: gameDataProviderKeyQuerySchema,
});
