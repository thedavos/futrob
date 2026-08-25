import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, PageHeader, PageHeaderDescription, PageHeaderTitle } from "@futrob/ui";
import { AcceptRosterInvitationForm } from "@/modules/teams/presentation/accept-roster-invitation-form.tsx";

const styles = stylex.create({
  main: {
    width: "100%",
    maxWidth: "36rem",
  },
});

export const Route = createFileRoute("/_app/roster-invitations/accept")({
  head: () => ({ meta: [{ title: "Unirte a una plantilla | Futrob" }] }),
  component: AcceptRosterInvitationPage,
});

function AcceptRosterInvitationPage() {
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>Únete a una plantilla</PageHeaderTitle>
        <PageHeaderDescription>
          Pega el enlace o código que recibiste para unirte al equipo.
        </PageHeaderDescription>
      </PageHeader>
      <AcceptRosterInvitationForm />
    </main>
  );
}
