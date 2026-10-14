import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AcceptInvitationDeepLink } from "@/modules/organizations/presentation/accept-invitation-deep-link.tsx";
import {
  forgetInvitationAccept,
  loadCompetitionInvitationAccept,
} from "@/modules/organizations/presentation/accept-invitation-once.ts";

export const Route = createFileRoute("/_app/invitations/accept/$plainToken")({
  ssr: false,
  preload: false,
  staleTime: Infinity,
  gcTime: Infinity,
  pendingComponent: AcceptInvitationPending,
  loader: ({ params, preload }) => loadCompetitionInvitationAccept(params.plainToken, preload),
  component: AcceptInvitationDeepLinkPage,
});

function AcceptInvitationPending() {
  return <AcceptInvitationDeepLink error={null} />;
}

function AcceptInvitationDeepLinkPage() {
  const { plainToken } = Route.useParams();
  const result = Route.useLoaderData();
  const router = useRouter();

  if (result.kind !== "error") {
    return <AcceptInvitationPending />;
  }

  return (
    <AcceptInvitationDeepLink
      error={result.error}
      onRetry={() => {
        forgetInvitationAccept(plainToken);
        void router.invalidate();
      }}
      retrying={router.state.isLoading}
    />
  );
}
