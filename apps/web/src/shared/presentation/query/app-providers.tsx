"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "./create-query-client.ts";

if (import.meta.env.DEV) {
  void import("virtual:stylex:runtime");
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(() => createAppQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
