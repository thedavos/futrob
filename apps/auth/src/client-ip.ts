import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

/**
 * The only header Better Auth reads for the client IP (rate limits). The auth
 * server sets it on every request after removing any value the caller sent.
 */
export const CLIENT_IP_HEADER = "x-futrob-client-ip";

/**
 * Shared secret that marks a request as forwarded by the web BFF. Only such a
 * request may carry its own `x-futrob-client-ip`.
 */
export const PROXY_SECRET_HEADER = "x-futrob-proxy-secret";

export interface ClientIpPolicy {
  /** Same value as web's `AUTH_PROXY_SECRET`; unset means no caller is a trusted proxy. */
  readonly proxySecret?: string;
  /**
   * Header the platform's load balancer sets with the client IP (`x-real-ip`,
   * `x-forwarded-for`, …). For a list, the last hop wins: it is the one the
   * balancer appended. Unset means the TCP peer is the client.
   */
  readonly trustedHeader?: string;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function isTrustedProxy(headers: Headers, policy: ClientIpPolicy): boolean {
  const presented = headers.get(PROXY_SECRET_HEADER);
  if (!policy.proxySecret || presented === null) return false;
  return timingSafeEqual(digest(presented), digest(policy.proxySecret));
}

function validIp(value: string | null | undefined): string | undefined {
  const ip = value?.trim();
  return ip && isIP(ip) !== 0 ? ip : undefined;
}

function lastHop(value: string | null): string | undefined {
  const hops = value?.split(",") ?? [];
  return validIp(hops.at(-1));
}

/**
 * Picks the client IP for one request:
 * 1. the IP the web BFF forwarded, when the request carries the proxy secret;
 * 2. otherwise the platform header named by `trustedHeader`;
 * 3. otherwise the TCP peer address.
 */
export function resolveClientIp(
  headers: Headers,
  peerAddress: string | undefined,
  policy: ClientIpPolicy,
): string | undefined {
  if (isTrustedProxy(headers, policy)) {
    return validIp(headers.get(CLIENT_IP_HEADER));
  }
  if (policy.trustedHeader) {
    return lastHop(headers.get(policy.trustedHeader));
  }
  return validIp(peerAddress);
}

/** Copies the request with the resolved IP as the only client-IP signal Better Auth sees. */
export function withClientIp(request: Request, ip: string | undefined): Request {
  const headers = new Headers(request.headers);
  headers.delete(PROXY_SECRET_HEADER);
  headers.delete(CLIENT_IP_HEADER);
  if (ip) headers.set(CLIENT_IP_HEADER, ip);
  return new Request(request, { headers });
}
