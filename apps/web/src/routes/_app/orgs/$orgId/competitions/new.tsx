import { createFileRoute } from "@tanstack/react-router";
import { CreateCompetitionForm } from "@/modules/competitions/presentation/create-competition-form.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/new")({
  component: NewCompetitionPage,
});

function NewCompetitionPage() {
  const { orgId } = Route.useParams();

  return (
    <main className="px-5 py-8 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 space-y-2">
          <h1 className="typo-heading">Nueva competición</h1>
          <p className="typo-subtitle max-w-xl text-muted-foreground">
            Define la base de la competición. Después completarás el setup operativo.
          </p>
        </div>
        <CreateCompetitionForm organizationId={orgId} />
      </div>
    </main>
  );
}
