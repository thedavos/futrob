import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/onboarding/team")({
  beforeLoad: () => {
    throw redirect({ to: "/onboarding/club", replace: true });
  },
});
