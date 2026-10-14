import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AcceptRosterInvitationDeepLink } from "@/modules/teams/presentation/accept-roster-invitation-deep-link.tsx";
import {
  forgetRosterInvitationAccept,
  loadRosterInvitationAccept,
} from "@/modules/teams/presentation/accept-roster-invitation-once.ts";

export const Route = createFileRoute("/_app/roster-invitations/accept/$token")({
  ssr: false,
  preload: false,
  staleTime: Infinity,
  gcTime: Infinity,
  head: () => ({ meta: [{ title: "Unirte a una plantilla | Futrob" }] }),
  pendingComponent: AcceptRosterInvitationPending,
  loader: ({ params, preload }) => loadRosterInvitationAccept(params.token, preload),
  component: AcceptRosterInvitationTokenPage,
});

function AcceptRosterInvitationPending() {
  return <AcceptRosterInvitationDeepLink error={null} />;
}

function AcceptRosterInvitationTokenPage() {
  const { token } = Route.useParams();
  const result = Route.useLoaderData();
  const router = useRouter();

  if (result.kind !== "error") {
    return <AcceptRosterInvitationPending />;
  }

  return (
    <AcceptRosterInvitationDeepLink
      error={result.error}
      onRetry={() => {
        forgetRosterInvitationAccept(token);
        void router.invalidate();
      }}
      retrying={router.state.isLoading}
    />
  );
}
