import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { withBffRequestCorrelation } from "@/shared/infrastructure/http/request-correlation.ts";

const bffRequestCorrelation = createMiddleware().server(async ({ next, pathname, request }) => {
  return correlateBffApiRequest(request, pathname, async () => (await next()).response);
});

export function correlateBffApiRequest(
  request: Request,
  pathname: string,
  next: () => Promise<Response>,
): Promise<Response> {
  if (!pathname.startsWith("/api/v1/")) return next();
  return withBffRequestCorrelation(request, async () => next());
}

export function shouldValidateCsrfRequest(handlerType: "router" | "serverFn"): boolean {
  return handlerType === "serverFn";
}

export const csrfMiddleware = createCsrfMiddleware({
  filter: ({ handlerType }) => shouldValidateCsrfRequest(handlerType),
});

export const startInstance = createStart(() => ({
  requestMiddleware: [bffRequestCorrelation, csrfMiddleware],
}));
