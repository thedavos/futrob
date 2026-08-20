import { createFileRoute } from "@tanstack/react-router";
import { handleAuthRequest } from "@/modules/identity/server/auth-request-handler.ts";

/**
 * Better Auth catch-all.
 * Ready endpoints (email/password):
 * - POST /api/auth/sign-up/email
 * - POST /api/auth/sign-in/email
 * - GET  /api/auth/get-session
 */
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuthRequest(request),
      POST: ({ request }) => handleAuthRequest(request),
    },
  },
});
