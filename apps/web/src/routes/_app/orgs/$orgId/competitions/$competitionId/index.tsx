import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@futrob/ui";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/")({
  head: () => ({ meta: [{ title: "Competición | Futrob" }] }),
  component: CompetitionHomePage,
});

function CompetitionHomePage() {
  const { orgId } = Route.useParams();
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <header className="mb-8 flex items-center gap-2.5">
        <Logo className="h-8 w-auto" />
        <span className="font-semibold tracking-wide">Futrob</span>
      </header>
      <div className="space-y-4">
        <h1 className="typo-heading">Ya formas parte de la competición</h1>
        <p className="text-sm text-muted-foreground">
          Tu acceso está listo. La experiencia de competición se completará en una próxima entrega.
        </p>
        <Link
          className="text-sm text-primary underline-offset-4 hover:underline"
          params={{ orgId }}
          to="/orgs/$orgId"
        >
          Ir a la organización
        </Link>
      </div>
    </main>
  );
}
