import { QueryClient } from "@tanstack/react-query";

function isClientHttpError(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error && typeof error.status === "number") {
    return error.status >= 400 && error.status < 500;
  }
  return false;
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (isClientHttpError(error)) {
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
