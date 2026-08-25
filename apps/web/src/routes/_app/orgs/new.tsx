import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, PageHeader, PageHeaderDescription, PageHeaderTitle } from "@futrob/ui";
import { CreateOrganizationForm } from "@/modules/organizations/presentation/create-organization-form.tsx";

const styles = stylex.create({
  main: {
    width: "100%",
    maxWidth: "36rem",
  },
});

export const Route = createFileRoute("/_app/orgs/new")({ component: NewOrganizationPage });

function NewOrganizationPage() {
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>Crear organización</PageHeaderTitle>
        <PageHeaderDescription>
          Crea otro espacio para administrar competiciones y equipos.
        </PageHeaderDescription>
      </PageHeader>
      <CreateOrganizationForm />
    </main>
  );
}
