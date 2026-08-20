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
