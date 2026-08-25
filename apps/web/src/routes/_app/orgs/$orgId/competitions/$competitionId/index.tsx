import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, colors, typography } from "@futrob/ui";

const styles = stylex.create({
  main: {
    width: "100%",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  body: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  link: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.primary,
    textUnderlineOffset: "4px",
    textDecorationLine: {
      default: "none",
      ":hover": "underline",
    },
  },
});

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/")({
  head: () => ({ meta: [{ title: "Competición | Futrob" }] }),
  component: CompetitionHomePage,
});

function CompetitionHomePage() {
  const { orgId } = Route.useParams();
  const link = applyStyles(styles.link);
  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.stack)}>
        <h1 {...applyStyles(typography.heading)}>Ya formas parte de la competición</h1>
        <p {...applyStyles(styles.body)}>
          Tu acceso está listo. La experiencia de competición se completará en una próxima entrega.
        </p>
        <Link
          className={link.className}
          params={{ orgId }}
          style={link.style}
          to="/orgs/$orgId"
        >
          Ir a la organización
        </Link>
      </div>
    </main>
  );
}
