import { createFileRoute } from "@tanstack/react-router";
import { AcceptInvitationForm } from "@/modules/organizations/presentation/accept-invitation-form.tsx";

export const Route = createFileRoute("/_app/invitations/accept/")({
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8 sm:px-8 sm:py-10">
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
