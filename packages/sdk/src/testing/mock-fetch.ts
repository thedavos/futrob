import { z } from "zod";
import { httpResponseBodySchema, type HttpResponseBody } from "../wire-body.ts";

/** Typed test double for `fetch` — no assertion required when the handler matches the Fetch API. */
export function mockFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (input, init) => Promise.resolve(handler(input, init));
}

export function requestUrl(input: RequestInfo | URL): string {
  if (input instanceof URL) {
    return input.href;
  }
  if (input instanceof Request) {
    return input.url;
  }
  return input;
}

function readMockJsonBody(init?: RequestInit): string | undefined {
  const body = init?.body;
  if (body === undefined || body === null) {
    return undefined;
  }
  if (Object.prototype.toString.call(body) !== "[object String]") {
    throw new TypeError("mockFetch tests must provide JSON bodies as strings");
  }
  return z.string().parse(body);
}

export function parseMockJsonBody(init?: RequestInit): HttpResponseBody {
  const body = readMockJsonBody(init);
  if (body === undefined) {
    return null;
  }
  return httpResponseBodySchema.parse(JSON.parse(body));
}
