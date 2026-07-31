import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@futrob/ui";
import { CreateOrganizationForm } from "@/modules/organizations/presentation/create-organization-form.tsx";

export const Route = createFileRoute("/_app/orgs/new")({ component: NewOrganizationPage });

function NewOrganizationPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-8">
      <header className="mb-10 flex items-center gap-2.5">
        <Logo className="h-8 w-auto" />
        <span className="font-semibold tracking-wide">Futrob</span>
      </header>
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
