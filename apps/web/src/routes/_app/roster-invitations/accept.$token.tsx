import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Logo, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { AcceptRosterInvitationForm } from "@/modules/teams/presentation/accept-roster-invitation-form.tsx";

const styles = stylex.create({
  main: {
    marginInline: "auto",
    width: "100%",
    maxWidth: "36rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: "2.5rem",
  },
  brand: {
    marginBottom: "2.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
  },
  logo: {
    height: "2rem",
    width: "auto",
  },
  wordmark: {
    fontWeight: 600,
    letterSpacing: "0.025em",
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

export const Route = createFileRoute("/_app/roster-invitations/accept/$token")({
  head: () => ({ meta: [{ title: "Unirte a una plantilla | Futrob" }] }),
  component: AcceptRosterInvitationTokenPage,
});

function AcceptRosterInvitationTokenPage() {
  const { token } = Route.useParams();
  const logo = applyStyles(styles.logo);

  return (
    <main {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.brand)}>
        <Logo className={logo.className} style={logo.style} />
        <span {...applyStyles(styles.wordmark)}>Futrob</span>
      </header>
      <div {...applyStyles(styles.intro)}>
        <h1 {...applyStyles(typography.heading)}>Únete a una plantilla</h1>
        <p {...applyStyles(typography.subtitle, styles.subtitle)}>
          Estamos procesando tu invitación para unirte al equipo.
        </p>
      </div>
      <AcceptRosterInvitationForm autoAccept initialToken={token} />
    </main>
  );
}
