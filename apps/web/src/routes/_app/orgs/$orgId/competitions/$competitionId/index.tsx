import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  TextLink,
} from "@futrob/ui";
const styles = stylex.create({
  main: {
    width: "100%",
  },
});

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/")({
  head: () => ({ meta: [{ title: "Competición | Futrob" }] }),
  component: CompetitionHomePage,
});

function CompetitionHomePage() {
  const { orgId } = Route.useParams();
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>Ya formas parte de la competición</PageHeaderTitle>
        <PageHeaderDescription>
          Tu acceso está listo. La experiencia de competición se completará en una próxima entrega.
        </PageHeaderDescription>
      </PageHeader>
      <TextLink render={<Link params={{ orgId }} to="/orgs/$orgId" />}>
        Ir a la organización
      </TextLink>
    </main>
  );
}
