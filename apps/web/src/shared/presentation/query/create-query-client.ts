import { QueryClient } from "@tanstack/react-query";
import {
  clientHttpErrorSchema,
  isClientHttpError,
} from "@/shared/infrastructure/http/client-http-error.ts";

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          const parsed = clientHttpErrorSchema.safeParse(error);
          if (parsed.success && isClientHttpError(parsed.data)) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
