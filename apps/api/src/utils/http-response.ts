type JsonSerializable = Parameters<typeof JSON.stringify>[0];

export function jsonResponse(data: JsonSerializable, status = 200): Response {
  const body = JSON.stringify(data);
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      // Fresh headers every call — a shared object gets mutated by
      // @hono/node-server when it assigns Content-Length, which then
      // leaks across requests and truncates larger JSON bodies.
      "content-length": String(Buffer.byteLength(body)),
    },
  });
}

/**
 * Cache policy of the anonymous public reads (ADR-0024). Browsers always revalidate
 * (`max-age=0`); a shared cache may serve a copy for 30 s and a stale one for another 60 s
 * while it refreshes. Official projections run in-process after a result is confirmed, so
 * this is the window in which a spectator can still see the previous table.
 */
export const PUBLIC_READ_CACHE_CONTROL =
  "public, max-age=0, s-maxage=30, stale-while-revalidate=60";

/**
 * Successful, shareable JSON for the public portal. Only 2xx bodies use it: error bodies
 * carry the per-request `requestId`, so they stay `no-store` through `jsonResponse`.
 */
export function publicJsonResponse(data: JsonSerializable): Response {
  const response = jsonResponse(data);
  response.headers.set("cache-control", PUBLIC_READ_CACHE_CONTROL);
  return response;
}

export function textResponse(body: string, contentType: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
      "content-length": String(Buffer.byteLength(body)),
    },
  });
}
