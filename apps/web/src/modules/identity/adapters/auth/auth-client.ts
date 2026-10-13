import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  // PrivateContentGate confirms the session when the tab comes back; a second focus refetch
  // would only repeat that round trip.
  sessionOptions: { refetchOnWindowFocus: false },
});
