import { Navigate, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { NOINDEX_META } from "@/shared/infrastructure/seo/crawl-policy.ts";
import { authClient } from "@/modules/identity/auth-client.ts";
import { AccountDeletionGate } from "@/modules/identity/presentation/account-deletion-gate.tsx";
import { PrivateContentGate } from "@/modules/identity/presentation/private-content-gate.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { AuthenticatedContent } from "@/shared/presentation/shell/authenticated-content.tsx";
import { PendingScreen } from "@/shared/presentation/status-screen.tsx";

export const Route = createFileRoute("/_app")({
  // Signed-in area: never in search results, whatever a crawler manages to reach.
  head: () => ({ meta: [NOINDEX_META] }),
  component: AppLayout,
});

function AppLayout() {
  const location = useLocation();
  const { t } = useI18n();
  const session = authClient.useSession();

  if (session.isPending) {
    return <PendingScreen message={t("auth.session.checking")} />;
  }

  if (session.data?.user == null) {
    return <Navigate replace search={{ redirectTo: location.pathname }} to="/login" />;
  }

  return (
    <PrivateContentGate>
      <AccountDeletionGate>
        <AuthenticatedContent>
          <Outlet />
        </AuthenticatedContent>
      </AccountDeletionGate>
    </PrivateContentGate>
  );
}
