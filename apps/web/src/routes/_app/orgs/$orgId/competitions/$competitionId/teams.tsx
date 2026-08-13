import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/teams")({
  validateSearch: z.object({ teamId: z.string().min(1).optional() }),
  head: () => ({ meta: [{ title: "Equipos y plantillas | Futrob" }] }),
});
