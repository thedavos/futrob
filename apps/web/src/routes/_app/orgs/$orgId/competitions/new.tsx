import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, PageHeader, PageHeaderDescription, PageHeaderTitle } from "@futrob/ui";
import { CreateCompetitionForm } from "@/modules/competitions/presentation/create-competition-form.tsx";

const styles = stylex.create({
  main: {
    width: "100%",
    maxWidth: "48rem",
  },
});

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/new")({
  component: NewCompetitionPage,
});

function NewCompetitionPage() {
  const { orgId } = Route.useParams();

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>Nueva competición</PageHeaderTitle>
        <PageHeaderDescription>
          Define la base de la competición. Después completarás el setup operativo.
        </PageHeaderDescription>
      </PageHeader>
      <CreateCompetitionForm organizationId={orgId} />
    </main>
  );
}
