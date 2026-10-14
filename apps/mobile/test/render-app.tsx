/// <reference types="vite-plus/client" />
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ComponentType } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createTestMobileQueryClient } from "@/modules/query/create-query-client";
import { registerRoutes, resetTestRouter, TestRouter } from "./expo-router";

const routeModules = import.meta.glob<{ default: ComponentType }>("../app/**/*.tsx", {
  eager: true,
});
registerRoutes(
  Object.fromEntries(
    Object.entries(routeModules).map(([file, module]) => [file.replace("../app/", ""), module]),
  ),
);

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Mounts the Expo app's route files at `href`, the way a deep link or cold start would. */
export function renderApp(href: string) {
  resetTestRouter();
  const queryClient = createTestMobileQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={metrics}>
        <TestRouter initialHref={href} />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

export function cleanupApp() {
  cleanup();
  resetTestRouter();
}
