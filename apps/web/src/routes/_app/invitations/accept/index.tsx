import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { AcceptInvitationForm } from "@/modules/organizations/presentation/accept-invitation-form.tsx";

const styles = stylex.create({
  main: {
    width: "100%",
    maxWidth: "36rem",
  },
  intro: {
    marginBottom: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  subtitle: {
    color: colors.mutedForeground,
  },
});

export const Route = createFileRoute("/_app/invitations/accept/")({
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.intro)}>
        <h1 {...applyStyles(typography.heading)}>Únete a una competición</h1>
        <p {...applyStyles(typography.subtitle, styles.subtitle)}>
          Escribe el código que recibiste para acceder directamente a la competición.
        </p>
      </div>
      <AcceptInvitationForm />
    </main>
  );
}
