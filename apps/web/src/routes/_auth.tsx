import { createFileRoute, Outlet } from "@tanstack/react-router";
import { z } from "zod";
import { AuthResumeProvider } from "@/modules/identity/presentation/auth-resume.tsx";
import { AuthTunnelShell } from "@/modules/identity/presentation/auth-tunnel-shell.tsx";
import { resolveSafeRedirect } from "@/modules/identity/presentation/safe-redirect.ts";

export type AuthSearch = {
  /** Safe in-app resume path; omitted when absent or unsafe. */
  redirectTo?: string;
};

const authSearchSchema = z.object({
  redirectTo: z.string().optional(),
});

export const Route = createFileRoute("/_auth")({
  validateSearch: (search): AuthSearch => {
    const parsed = authSearchSchema.safeParse(search);
    const redirectTo = resolveSafeRedirect(
      parsed.success ? (parsed.data.redirectTo ?? null) : null,
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
