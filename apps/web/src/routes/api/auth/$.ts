import { createFileRoute } from "@tanstack/react-router";
import { handleAuthRequest } from "@/modules/identity/server/auth-request-handler.ts";

/**
 * Same-origin proxy to the `apps/auth` server (ADR-0015).
 * Email/password and get-session are served by apps/auth.
 */
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuthRequest(request),
      POST: ({ request }) => handleAuthRequest(request),
    },
  },
});
