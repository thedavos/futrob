import { createFileRoute, useRouter } from "@tanstack/react-router";
import { handOffInvitationToOnboarding } from "@/modules/identity/presentation/onboarding/onboarding-invitation-handoff.ts";
import { AcceptInvitationDeepLink } from "@/modules/organizations/presentation/accept-invitation-deep-link.tsx";
import {
  forgetInvitationAccept,
  loadCompetitionInvitationAccept,
  localizeInvitationAcceptFailure,
} from "@/modules/organizations/presentation/accept-invitation-once.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export const Route = createFileRoute("/_app/invitations/accept/$plainToken")({
  ssr: false,
  preload: false,
  staleTime: Infinity,
  gcTime: Infinity,
  pendingComponent: AcceptInvitationPending,
  loader: ({ params, preload }) =>
    loadCompetitionInvitationAccept(params.plainToken, preload, () =>
      handOffInvitationToOnboarding(params.plainToken),
    ),
  component: AcceptInvitationDeepLinkPage,
});

function AcceptInvitationPending() {
  return <AcceptInvitationDeepLink error={null} />;
}

function AcceptInvitationDeepLinkPage() {
  const { plainToken } = Route.useParams();
  const result = Route.useLoaderData();
  const router = useRouter();
  const { t } = useI18n();

  if (result.kind !== "error") {
    return <AcceptInvitationPending />;
  }

  return (
    <AcceptInvitationDeepLink
      error={localizeInvitationAcceptFailure(result.error, t)}
      onRetry={() => {
        forgetInvitationAccept(plainToken);
        void router.invalidate();
      }}
      retrying={router.state.isLoading}
    />
  );
}
