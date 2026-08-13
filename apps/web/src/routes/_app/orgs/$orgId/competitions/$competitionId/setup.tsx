import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/setup")({
  validateSearch: z.object({
    step: z.enum(["information", "format", "rules", "participants", "review"]).optional(),
  }),
});
