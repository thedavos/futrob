import { createFileRoute } from "@tanstack/react-router";
import { AcceptInvitationForm } from "@/modules/organizations/presentation/accept-invitation-form.tsx";

export const Route = createFileRoute("/_app/invitations/accept/")({
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  return (
    <main className="w-full max-w-xl">
      <div className="mb-8 space-y-2">
        <h1 className="typo-heading">Únete a una competición</h1>
        <p className="typo-subtitle text-muted-foreground">
          Escribe el código que recibiste para acceder directamente a la competición.
        </p>
      </div>
      <AcceptInvitationForm />
    </main>
  );
}
