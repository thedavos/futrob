import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  TextLink,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
const styles = stylex.create({
  main: {
    width: "100%",
  },
  id: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    color: colors.foreground,
  },
});

export const Route = createFileRoute("/_app/orgs/$orgId/")({
  component: OrgHomePage,
});

function OrgHomePage() {
  const { orgId } = Route.useParams();

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>Organización</PageHeaderTitle>
        <PageHeaderDescription>
          Espacio provisional para <span {...applyStyles(styles.id)}>{orgId}</span>. El panel
          operativo llega en la siguiente entrega.
        </PageHeaderDescription>
      </PageHeader>
      <TextLink render={<Link to="/orgs" />}>Ver todas las organizaciones</TextLink>
    </main>
  );
}
