import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, PageHeader, PageHeaderDescription, PageHeaderTitle } from "@futrob/ui";
import { AcceptInvitationForm } from "@/modules/organizations/presentation/accept-invitation-form.tsx";

const styles = stylex.create({
  main: {
    width: "100%",
    maxWidth: "36rem",
  },
});

export const Route = createFileRoute("/_app/invitations/accept/")({
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>Únete a una competición</PageHeaderTitle>
        <PageHeaderDescription>
          Escribe el código que recibiste para acceder directamente a la competición.
        </PageHeaderDescription>
      </PageHeader>
      <AcceptInvitationForm />
    </main>
  );
}
