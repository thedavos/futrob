import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { handleListAccessGrantsRequest } from "./-grants.handler.ts";

export const Route = createFileRoute("/api/v1/authorization/grants")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let client;
        try {
          ({ client } = await createAuthenticatedProductApiClient(request));
        } catch (error) {
          if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
          return productApiBffErrorResponseForError(error);
        }
        return handleListAccessGrantsRequest(request, {
          load: (query) => client.authorization.listGrants(query, { signal: request.signal }),
        });
      },
    },
  },
});
