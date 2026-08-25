import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
import { AcceptRosterInvitationForm } from "@/modules/teams/presentation/accept-roster-invitation-form.tsx";

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

export const Route = createFileRoute("/_app/roster-invitations/accept")({
  head: () => ({ meta: [{ title: "Unirte a una plantilla | Futrob" }] }),
  component: AcceptRosterInvitationPage,
});

function AcceptRosterInvitationPage() {
  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.intro)}>
        <h1 {...applyStyles(typography.heading)}>Únete a una plantilla</h1>
        <p {...applyStyles(typography.subtitle, styles.subtitle)}>
          Pega el enlace o código que recibiste para unirte al equipo.
        </p>
      </div>
      <AcceptRosterInvitationForm />
    </main>
  );
}
