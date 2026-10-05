import { requestUrl } from "@futrob/sdk/testing";
import { vi } from "vite-plus/test";

export type FakeRoute = (url: URL) => Response | Promise<Response>;

/**
 * Serves `/api/v1` paths from `routes` through the global `fetch` the app client uses.
 * Requests settle as aborted when the caller's signal aborts, like a real transport.
 */
export function installFakeApi(routes: Record<string, FakeRoute>) {
  const requests: { path: string; signal: AbortSignal | undefined }[] = [];
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(requestUrl(input));
    const path = url.pathname.replace(/^\/api\/v1/, "");
    const signal = init?.signal ?? undefined;
    requests.push({ path, signal });
    const route = routes[path];
    if (!route) return Promise.reject(new Error(`Unexpected API request ${path}`));
    return new Promise<Response>((resolve, reject) => {
      const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
      if (signal?.aborted) return abort();
      signal?.addEventListener("abort", abort, { once: true });
      Promise.resolve(route(url)).then(resolve, reject);
    });
  });
  return { routes, requests };
}

export function apiError(status: number): Response {
  return Response.json(
    {
      code: status === 401 ? "auth.unauthorized" : "api.unavailable",
      messageKey: status === 401 ? "errors.auth.unauthorized" : "errors.api.unavailable",
      requestId: "8ef98de4-a8ab-4e88-a864-b36857421667",
    },
    { status },
  );
}
