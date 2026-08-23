const STRIPPED_REQUEST_HEADERS = [
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

export function resolveAuthServiceUrl(
  bindingUrl: string | undefined,
  processUrl: string | undefined,
): string | undefined {
  const trimmed = (bindingUrl ?? processUrl)?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

export function buildAuthProxyHeaders(request: Request, incoming: URL): Headers {
  const headers = new Headers(request.headers);
  for (const name of STRIPPED_REQUEST_HEADERS) {
    headers.delete(name);
  }
  for (const name of [...headers.keys()]) {
    if (name.startsWith("cf-")) {
      headers.delete(name);
    }
  }
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(/:$/, ""));
  return headers;
}

export async function proxyAuthRequest(
  request: Request,
  authServiceUrl: string,
): Promise<Response> {
  const incoming = new URL(request.url);
  const base = authServiceUrl.replace(/\/$/, "");
  const target = `${base}${incoming.pathname}${incoming.search}`;
  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : request.body;
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: buildAuthProxyHeaders(request, incoming),
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  };
  if (body) {
    init.duplex = "half";
  }

  return await fetch(target, init);
}
