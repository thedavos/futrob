import { createFileRoute } from "@tanstack/react-router";
import { AcceptInvitationPage } from "@/modules/organizations/presentation/accept-invitation-page.tsx";

export const Route = createFileRoute("/_app/invitations/accept/")({
  component: AcceptInvitationPage,
});
