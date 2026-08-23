import { apiErrorResponse } from "@/shared/infrastructure/http/api-response.ts";

export const AUTH_PROXY_TIMEOUT_MS = 10_000;
const AUTH_SERVICE_ORIGIN = "https://futrob-auth.internal";

const HOP_BY_HOP_HEADERS = [
  "connection",
  "forwarded",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "x-forwarded-for",
  "x-real-ip",
] as const;

export interface AuthServiceBinding {
  fetch(request: Request): Promise<Response>;
}

export function isAuthApiPath(pathname: string): boolean {
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

export function buildAuthProxyTarget(incoming: URL): string | undefined {
  if (!isAuthApiPath(incoming.pathname)) {
    return undefined;
  }
  return `${AUTH_SERVICE_ORIGIN}${incoming.pathname}${incoming.search}`;
}

export function stripHopByHopHeaders(headers: Headers): Headers {
  const next = new Headers(headers);
  for (const name of HOP_BY_HOP_HEADERS) {
    next.delete(name);
  }
  for (const name of [...next.keys()]) {
    if (name.startsWith("cf-")) {
      next.delete(name);
    }
  }
  return next;
}

export function buildAuthProxyHeaders(request: Request, incoming: URL): Headers {
  const clientIp = request.headers.get("cf-connecting-ip");
  const headers = stripHopByHopHeaders(request.headers);
  if (clientIp) {
    headers.set("cf-connecting-ip", clientIp);
  }
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(/:$/, ""));
  return headers;
}

export async function proxyAuthRequest(
  request: Request,
  authService: AuthServiceBinding,
  timeoutMs: number = AUTH_PROXY_TIMEOUT_MS,
): Promise<Response> {
  const incoming = new URL(request.url);
  const target = buildAuthProxyTarget(incoming);
  if (!target) {
    return new Response(null, { status: 404 });
  }

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const upstream = await authService.fetch(
    new Request(target, {
      method: request.method,
      headers: buildAuthProxyHeaders(request, incoming),
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    }),
  );

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: stripHopByHopHeaders(upstream.headers),
  });
}

export async function forwardAuthRequest(
  request: Request,
  authService: AuthServiceBinding | undefined,
  timeoutMs: number = AUTH_PROXY_TIMEOUT_MS,
): Promise<Response> {
  if (!authService) {
    return apiErrorResponse(503, {
      code: "auth.misconfigured",
      messageKey: "errors.auth.misconfigured",
    });
  }

  try {
    return await proxyAuthRequest(request, authService, timeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "auth proxy failed";
    console.error(JSON.stringify({ event: "auth.proxy.upstream_failed", message }));
    return apiErrorResponse(502, {
      code: "auth.unavailable",
      messageKey: "errors.auth.unavailable",
    });
  }
}
