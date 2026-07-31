import { getRequest } from "@tanstack/react-start/server";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";

export type AuthenticatedProductApiContext = Awaited<
  ReturnType<typeof createAuthenticatedProductApiClient>
>;

/**
 * Server-only entry point for route loaders and server functions that need the
 * authenticated actor plus the trusted product API client.
 */
export async function withAuthenticatedProductApi<TResult>(
  load: (context: AuthenticatedProductApiContext) => Promise<TResult>,
): Promise<TResult> {
  const context = await createAuthenticatedProductApiClient(getRequest());
  return load(context);
}
