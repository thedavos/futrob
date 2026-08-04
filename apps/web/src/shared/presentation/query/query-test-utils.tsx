import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function QueryTestProvider({
  children,
  client = createTestQueryClient(),
}: Readonly<{ children: ReactNode; client?: QueryClient }>) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
