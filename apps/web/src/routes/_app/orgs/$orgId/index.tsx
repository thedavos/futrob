import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/orgs/$orgId/")({
  component: OrgHomePage,
});

function OrgHomePage() {
  const { orgId } = Route.useParams();

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="space-y-4">
        <h1 className="typo-heading">Organización</h1>
        <p className="text-sm text-muted-foreground">
          Espacio provisional para <span className="font-mono text-foreground">{orgId}</span>. El
          panel operativo llega en la siguiente entrega.
        </p>
        <p>
          <Link className="text-sm underline-offset-4 hover:underline" to="/orgs">
            Ver todas las organizaciones
          </Link>
        </p>
      </div>
    </main>
  );
}
