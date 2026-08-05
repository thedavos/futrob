import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthResumeProvider } from "@/modules/identity/presentation/auth-resume.tsx";
import { AuthTunnelShell } from "@/modules/identity/presentation/auth-tunnel-shell.tsx";
import { resolveSafeRedirect } from "@/modules/identity/presentation/safe-redirect.ts";

export type AuthSearch = {
  /** Safe in-app resume path; omitted when absent or unsafe. */
  redirectTo?: string;
};

export const Route = createFileRoute("/_auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => {
    const redirectTo = resolveSafeRedirect(
      typeof search.redirectTo === "string" ? search.redirectTo : null,
    );
    return redirectTo == null ? {} : { redirectTo };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { redirectTo } = Route.useSearch();

  return (
    <AuthTunnelShell>
      <AuthResumeProvider redirectTo={redirectTo}>
        <Outlet />
      </AuthResumeProvider>
    </AuthTunnelShell>
  );
}
