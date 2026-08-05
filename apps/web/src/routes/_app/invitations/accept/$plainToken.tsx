import { createFileRoute } from "@tanstack/react-router";
import { AcceptInvitationDeepLink } from "@/modules/organizations/presentation/accept-invitation-deep-link.tsx";

export const Route = createFileRoute("/_app/invitations/accept/$plainToken")({
  component: AcceptInvitationDeepLinkPage,
});

function AcceptInvitationDeepLinkPage() {
  const { plainToken } = Route.useParams();
  return <AcceptInvitationDeepLink plainToken={plainToken} />;
}
