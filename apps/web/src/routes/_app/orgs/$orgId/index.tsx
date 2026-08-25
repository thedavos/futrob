import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
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
  id: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    color: colors.foreground,
  },
  link: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    textUnderlineOffset: "4px",
    textDecorationLine: {
      default: "none",
      ":hover": "underline",
    },
  },
});

export const Route = createFileRoute("/_app/orgs/$orgId/")({
  component: OrgHomePage,
});

function OrgHomePage() {
  const { orgId } = Route.useParams();
  const link = applyStyles(styles.link);

  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.stack)}>
        <h1 {...applyStyles(typography.heading)}>Organización</h1>
        <p {...applyStyles(styles.body)}>
          Espacio provisional para <span {...applyStyles(styles.id)}>{orgId}</span>. El panel
          operativo llega en la siguiente entrega.
        </p>
        <p>
          <Link className={link.className} style={link.style} to="/orgs">
            Ver todas las organizaciones
          </Link>
        </p>
      </div>
    </main>
  );
}
