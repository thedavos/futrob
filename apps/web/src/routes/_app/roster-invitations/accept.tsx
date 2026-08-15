import { createFileRoute } from "@tanstack/react-router";
import { AcceptRosterInvitationForm } from "@/modules/teams/presentation/accept-roster-invitation-form.tsx";

export const Route = createFileRoute("/_app/roster-invitations/accept")({
  head: () => ({ meta: [{ title: "Unirte a una plantilla | Futrob" }] }),
  component: AcceptRosterInvitationPage,
});

function AcceptRosterInvitationPage() {
  return (
    <main className="w-full max-w-xl">
      <div className="mb-8 space-y-2">
        <h1 className="typo-heading">Únete a una plantilla</h1>
        <p className="typo-subtitle text-muted-foreground">
          Pega el enlace o código que recibiste para unirte al equipo.
        </p>
      </div>
      <AcceptRosterInvitationForm />
    </main>
  );
}
