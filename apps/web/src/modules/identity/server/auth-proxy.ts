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

export interface AuthServiceBinding {
  fetch(request: Request): Promise<Response>;
}

export function buildAuthProxyHeaders(request: Request, incoming: URL): Headers {
  const clientIp = request.headers.get("cf-connecting-ip");
  const headers = new Headers(request.headers);
  for (const name of STRIPPED_REQUEST_HEADERS) {
    headers.delete(name);
  }
  for (const name of [...headers.keys()]) {
    if (name.startsWith("cf-")) {
      headers.delete(name);
    }
  }
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
): Promise<Response> {
  const incoming = new URL(request.url);
  const target = `https://futrob-auth.internal${incoming.pathname}${incoming.search}`;
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

  return await authService.fetch(new Request(target, init));
}
