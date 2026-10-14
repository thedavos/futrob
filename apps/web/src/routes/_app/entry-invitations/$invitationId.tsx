import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, PageHeader, PageHeaderDescription, PageHeaderTitle } from "@futrob/ui";
import { EntryInvitationAcceptPage } from "@/modules/competitions/presentation/entry-invitations/entry-invitation-accept-page.tsx";

const styles = stylex.create({
  main: {
    display: "grid",
    width: "100%",
    maxWidth: "40rem",
    gap: "1.5rem",
  },
});

export const Route = createFileRoute("/_app/entry-invitations/$invitationId")({
  head: () => ({ meta: [{ title: "Invitación a una competición | Futrob" }] }),
  component: DirectedEntryInvitationPage,
});

function DirectedEntryInvitationPage() {
  const { invitationId } = Route.useParams();
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>Invitación a una competición</PageHeaderTitle>
        <PageHeaderDescription>
          Te invitaron a inscribir tu equipo. Al aceptar, serás su capitán.
        </PageHeaderDescription>
      </PageHeader>
      <EntryInvitationAcceptPage reference={{ invitationId }} />
    </main>
  );
}
