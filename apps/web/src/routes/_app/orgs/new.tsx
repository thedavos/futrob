import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
import { CreateOrganizationForm } from "@/modules/organizations/presentation/create-organization-form.tsx";

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

export const Route = createFileRoute("/_app/orgs/new")({ component: NewOrganizationPage });

function NewOrganizationPage() {
  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.intro)}>
        <h1 {...applyStyles(typography.heading)}>Crear organización</h1>
        <p {...applyStyles(typography.subtitle, styles.subtitle)}>
          Crea otro espacio para administrar competiciones y equipos.
        </p>
      </div>
      <CreateOrganizationForm />
    </main>
  );
}
