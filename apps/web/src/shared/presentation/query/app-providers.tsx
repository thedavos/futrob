"use client";

import "@futrob/ui/styles/media.stylex";
import "@futrob/ui/styles/tokens.stylex";
import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "./create-query-client.ts";

if (import.meta.env.DEV) {
  // HMR only. First paint uses the /virtual:stylex.css link in __root.tsx.
  void import("virtual:stylex:runtime");
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(() => createAppQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
