import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthTunnelShell } from "@/modules/identity/presentation/auth-tunnel-shell.tsx";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <AuthTunnelShell>
      <Outlet />
    </AuthTunnelShell>
  );
}
