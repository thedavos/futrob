import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@futrob/ui";
import { AcceptInvitationForm } from "@/modules/organizations/presentation/accept-invitation-form.tsx";

export const Route = createFileRoute("/_app/invitations/accept/")({
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-8">
      <header className="mb-10 flex items-center gap-2.5">
        <Logo className="h-8 w-auto" />
        <span className="font-semibold tracking-wide">Futrob</span>
      </header>
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
