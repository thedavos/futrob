import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Logo, PageHeader, PageHeaderDescription, PageHeaderTitle } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { EntryInvitationLinkPage } from "@/modules/competitions/presentation/entry-invitations/entry-invitation-link-page.tsx";

const styles = stylex.create({
  main: {
    display: "grid",
    marginInline: "auto",
    width: "100%",
    maxWidth: "36rem",
    gap: "1.5rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: "2.5rem",
  },
  brand: {
    marginBottom: "1rem",
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
});

export const Route = createFileRoute("/entry-invitations/link/$code")({
  head: () => ({ meta: [{ title: "Inscribe tu equipo | Futrob" }] }),
  component: EntryInvitationLinkRoute,
});

function EntryInvitationLinkRoute() {
  const { code } = Route.useParams();
  const logo = applyStyles(styles.logo);
  return (
    <main {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.brand)}>
        <Logo className={logo.className} style={logo.style} />
        <span {...applyStyles(styles.wordmark)}>Futrob</span>
      </header>
      <PageHeader>
        <PageHeaderTitle>Inscribe tu equipo</PageHeaderTitle>
        <PageHeaderDescription>
          Te compartieron una invitación para participar en una competición.
        </PageHeaderDescription>
      </PageHeader>
      <EntryInvitationLinkPage code={code} />
    </main>
  );
}
