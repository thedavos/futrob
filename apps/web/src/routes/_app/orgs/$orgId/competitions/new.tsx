import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
import { CreateCompetitionForm } from "@/modules/competitions/presentation/create-competition-form.tsx";

const styles = stylex.create({
  main: {
    width: "100%",
    maxWidth: "48rem",
  },
  intro: {
    marginBottom: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  subtitle: {
    maxWidth: "36rem",
    color: colors.mutedForeground,
  },
});

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/new")({
  component: NewCompetitionPage,
});

function NewCompetitionPage() {
  const { orgId } = Route.useParams();

  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.intro)}>
        <h1 {...applyStyles(typography.heading)}>Nueva competición</h1>
        <p {...applyStyles(typography.subtitle, styles.subtitle)}>
          Define la base de la competición. Después completarás el setup operativo.
        </p>
      </div>
      <CreateCompetitionForm organizationId={orgId} />
    </main>
  );
}
