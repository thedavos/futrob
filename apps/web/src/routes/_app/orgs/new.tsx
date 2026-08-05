import { createFileRoute } from "@tanstack/react-router";
import { CreateOrganizationForm } from "@/modules/organizations/presentation/create-organization-form.tsx";

export const Route = createFileRoute("/_app/orgs/new")({ component: NewOrganizationPage });

function NewOrganizationPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-8 space-y-2">
        <h1 className="typo-heading">Crear organización</h1>
        <p className="typo-subtitle text-muted-foreground">
          Crea otro espacio para administrar competiciones y equipos.
        </p>
      </div>
      <CreateOrganizationForm />
    </main>
  );
}
