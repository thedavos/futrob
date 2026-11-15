import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleWithdrawSwissTeam } from "@/modules/scheduling/server/competition-fixture.handler.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/fixtures/$fixturePlanId/swiss/withdrawals",
)({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        handleWithdrawSwissTeam(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
    },
  },
});
