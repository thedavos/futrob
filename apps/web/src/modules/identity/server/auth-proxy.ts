import { z } from "zod";
import { apiErrorResponse } from "@/shared/infrastructure/http/api-response.ts";
import { AuthServiceUnavailableError } from "./auth-errors.ts";

export const AUTH_PROXY_TIMEOUT_MS = 10_000;
/** Placeholder origin; `createHttpAuthService` rewrites it to `FUTROB_AUTH_BASE_URL`. */
const AUTH_SERVICE_ORIGIN = "https://futrob-auth.internal";
/** apps/auth reads the client IP from this header, only next to a valid proxy secret. */
export const AUTH_CLIENT_IP_HEADER = "x-futrob-client-ip";
export const AUTH_PROXY_SECRET_HEADER = "x-futrob-proxy-secret";
const AUTH_SESSION_PATH = "/api/auth/get-session";

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
  AUTH_CLIENT_IP_HEADER,
  AUTH_PROXY_SECRET_HEADER,
] as const;

/** Entity headers from a BFF POST/PUT must not ride along on GET /get-session. */
const ENTITY_BODY_HEADERS = [
  "content-encoding",
  "content-language",
  "content-length",
  "content-range",
  "content-type",
] as const;

/** How web reaches apps/auth; `createHttpAuthService` is the deployed implementation. */
export interface AuthServiceBinding {
  fetch(request: Request): Promise<Response>;
}

/**
 * Calls apps/auth over HTTP at `baseUrl`. Every request carries the proxy secret, so
 * auth trusts the client IP that `buildAuthProxyHeaders` forwards.
 */
export function createHttpAuthService(input: {
  readonly baseUrl: string;
  readonly proxySecret: string;
  readonly fetcher?: typeof fetch;
}): AuthServiceBinding {
  const base = new URL(input.baseUrl);
  const fetcher = input.fetcher ?? fetch;
  return {
    fetch(request) {
      const source = new URL(request.url);
      const target = new URL(`${source.pathname}${source.search}`, base);
      const forwarded = new Request(target, request);
      forwarded.headers.set(AUTH_PROXY_SECRET_HEADER, input.proxySecret);
      return fetcher(forwarded);
    },
  };
}

/** The auth service configured for this Worker, or undefined when either variable is missing. */
export function authServiceFromBindings(bindings: {
  readonly FUTROB_AUTH_BASE_URL?: string;
  readonly AUTH_PROXY_SECRET?: string;
}): AuthServiceBinding | undefined {
  const baseUrl = bindings.FUTROB_AUTH_BASE_URL?.trim();
  const proxySecret = bindings.AUTH_PROXY_SECRET?.trim();
  if (!baseUrl || !proxySecret) return undefined;
  return createHttpAuthService({ baseUrl, proxySecret });
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
  // Cloudflare sets CF-Connecting-IP on the request that reached this Worker.
  const clientIp = request.headers.get("cf-connecting-ip");
  const headers = stripHopByHopHeaders(request.headers);
  if (clientIp) {
    headers.set(AUTH_CLIENT_IP_HEADER, clientIp);
  }
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(/:$/, ""));
  return headers;
}

/** Session lookup is always GET; drop the originating request's entity headers. */
export function buildAuthSessionHeaders(request: Request, incoming: URL): Headers {
  const headers = buildAuthProxyHeaders(request, incoming);
  for (const name of ENTITY_BODY_HEADERS) {
    headers.delete(name);
  }
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

const authSessionActorSchema = z.object({
  actorId: z.string().min(1).nullish(),
});

const authSessionUserNameSchema = z.object({
  user: z.object({ name: z.string().nullish() }),
});

/**
 * Best-effort display name from the Better Auth session (for server-side
 * snapshots). Returns null instead of throwing: the caller's flow must not
 * fail because a cosmetic name lookup did.
 */
export async function fetchAuthSessionUserName(
  request: Request,
  authService: AuthServiceBinding | undefined,
  timeoutMs: number = AUTH_PROXY_TIMEOUT_MS,
): Promise<string | null> {
  if (!authService) return null;
  const incoming = new URL(request.url);
  try {
    const upstream = await authService.fetch(
      new Request(`${AUTH_SERVICE_ORIGIN}${AUTH_SESSION_PATH}`, {
        method: "GET",
        headers: buildAuthSessionHeaders(request, incoming),
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      }),
    );
    if (!upstream.ok) return null;
    const raw: unknown = await upstream.json().catch(() => null);
    const parsed = authSessionUserNameSchema.safeParse(raw);
    if (!parsed.success) return null;
    const name = parsed.data.user.name?.trim();
    return name ? name : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the authenticated ActorId through apps/auth. `get-session` carries the
 * actor provisioned by apps/auth (ADR-0021); web reads no session, user or
 * identity tables. `null` means no session or no provisioned actor.
 */
export async function fetchAuthSessionActorId(
  request: Request,
  authService: AuthServiceBinding,
  timeoutMs: number = AUTH_PROXY_TIMEOUT_MS,
): Promise<string | null> {
  const incoming = new URL(request.url);
  try {
    const upstream = await authService.fetch(
      new Request(`${AUTH_SERVICE_ORIGIN}${AUTH_SESSION_PATH}`, {
        method: "GET",
        headers: buildAuthSessionHeaders(request, incoming),
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      }),
    );

    if (upstream.status === 401 || upstream.status === 403) {
      return null;
    }
    if (!upstream.ok) {
      throw new AuthServiceUnavailableError({
        code: "auth.unavailable",
        message: "Authentication service is unavailable",
      });
    }

    const raw: unknown = await upstream.json().catch(() => null);
    if (raw == null) {
      return null;
    }
    const parsed = authSessionActorSchema.safeParse(raw);
    return parsed.success ? (parsed.data.actorId ?? null) : null;
  } catch (error) {
    if (error instanceof AuthServiceUnavailableError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "auth session lookup failed";
    console.error(JSON.stringify({ event: "auth.session.upstream_failed", message }));
    throw new AuthServiceUnavailableError({
      code: "auth.unavailable",
      message,
    });
  }
}
