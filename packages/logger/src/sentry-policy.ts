/**
 * SDK-agnostic Sentry policy for every Futrob runtime.
 * Apps wrap their platform SDK around this. Domain code never imports it.
 */

import { z } from "zod";
import type { LogFields } from "./types.ts";

export const FUTROB_SENTRY_SERVICES = ["web", "auth", "api", "mobile"] as const;
export type FutrobSentryService = (typeof FUTROB_SENTRY_SERVICES)[number];

export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

const REQUEST_ID_HEADER_NAMES = ["x-request-id", "X-Request-ID"] as const;
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
  "x-api-key",
  "x-csrf-token",
  "x-futrob-actor-id",
]);

const SENSITIVE_KEY = /token|authorization|bearer|secret|password|cookie|email|credential/i;

const expectedFailureSchema = z.object({ code: z.string().min(1) });
const extraValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const extraSchema = z.record(z.string(), extraValueSchema);
const headerMapSchema = z.record(z.string(), z.string());
const headerTuplesSchema = z.array(z.tuple([z.string(), z.string()]));
const headersSchema = z.union([headerMapSchema, headerTuplesSchema]);
const requestSchema = z
  .object({
    method: z.string().optional(),
    url: z.string().optional(),
    headers: headersSchema.optional(),
  })
  .passthrough();
const userSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    email: z.string().nullable().optional(),
    ip_address: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
  })
  .passthrough()
  .nullable();
const breadcrumbSchema = z
  .object({
    data: extraSchema.optional(),
    message: z.string().optional(),
    category: z.string().optional(),
  })
  .passthrough();
const eventBagSchema = z
  .object({
    extra: extraSchema.optional().catch(undefined),
    breadcrumbs: z.array(breadcrumbSchema).optional().catch(undefined),
  })
  .passthrough();

export interface SentryInitConfig {
  readonly dsn: string;
  readonly environment: string;
  readonly service: FutrobSentryService;
  readonly tracesSampleRate: typeof SENTRY_TRACES_SAMPLE_RATE;
}

export interface SentryInitInput {
  readonly dsn?: string | undefined;
  readonly nodeEnv?: string | undefined;
  readonly environment?: string | undefined;
  readonly service: FutrobSentryService;
}

export interface SentryHintLike {
  readonly originalException?: unknown;
}

/** Matches `@sentry/core` Primitive so platform ErrorEvent is assignable. */
export type SentryPrimitive = number | string | boolean | bigint | symbol | null | undefined;

type HeaderMap = Readonly<Record<string, string>>;

export interface SentryRequestLike {
  readonly method?: string;
  readonly url?: string;
  readonly headers?: HeaderMap | ReadonlyArray<readonly [string, string]>;
}

export interface SentryUserLike {
  readonly id?: string | number | null;
  readonly email?: string | null;
  readonly ip_address?: string | null;
  readonly username?: string | null;
  readonly name?: string | null;
}

export interface SentryEventLike {
  request?: SentryRequestLike;
  user?: SentryUserLike | null;
  extra?: object;
  breadcrumbs?: readonly object[];
  tags?: Record<string, SentryPrimitive>;
}

export function buildSentryInitConfig(input: SentryInitInput): SentryInitConfig | undefined {
  const dsn = input.dsn?.trim();
  if (!dsn || input.nodeEnv !== "production") return undefined;
  return {
    dsn,
    environment: input.environment?.trim() || "production",
    service: input.service,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  };
}

/** Expected failures carry a stable wire `code` (TaggedError and auth codes). */
export function isExpectedFailure(cause: unknown): boolean {
  return expectedFailureSchema.safeParse(cause).success;
}

export function sentryServiceTags(config: SentryInitConfig) {
  return {
    service: config.service,
    environment: config.environment,
  };
}

export function filterAndScrubSentryEvent<T extends SentryEventLike>(
  event: T,
  hint?: SentryHintLike,
): T | null {
  if (isExpectedFailure(hint?.originalException)) return null;
  return scrubSentryEvent(event);
}

/** Shared SDK options. Apps pass this to `Sentry.init` / `withSentry` and attach `beforeSend`. */
export function sentrySdkOptions(input: SentryInitInput) {
  const config = buildSentryInitConfig(input);
  if (!config) return undefined;
  return {
    dsn: config.dsn,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
    sendDefaultPii: false as const,
    initialScope: { tags: sentryServiceTags(config) },
  };
}

export function applySentryEventPolicy<T extends SentryEventLike>(
  event: T,
  hint?: SentryHintLike,
): T | null {
  const scrubbed = filterAndScrubSentryEvent(event, hint);
  if (!scrubbed) return null;
  return withRequestIdTag(scrubbed, requestIdFromSentryEvent(scrubbed));
}

export function requestIdFromSentryEvent(event: SentryEventLike): string | undefined {
  const headers = headersFromRequest(event.request);
  if (!headers) return undefined;
  for (const name of REQUEST_ID_HEADER_NAMES) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (value && REQUEST_ID_PATTERN.test(value)) return value;
  }
  return undefined;
}

export function withRequestIdTag<T extends SentryEventLike>(
  event: T,
  requestId: string | undefined,
): T {
  if (!requestId) return event;
  return {
    ...event,
    tags: { ...event.tags, request_id: requestId },
  };
}

export function scrubSentryEvent<T extends SentryEventLike>(event: T): T {
  const bag = eventBagSchema.safeParse(event);
  const extra = bag.success && bag.data.extra ? redactFields(bag.data.extra) : undefined;
  const breadcrumbs =
    bag.success && bag.data.breadcrumbs
      ? bag.data.breadcrumbs.map((breadcrumb) =>
          breadcrumb.data ? { ...breadcrumb, data: redactFields(breadcrumb.data) } : breadcrumb,
        )
      : undefined;
  return {
    ...event,
    request: scrubRequest(event.request),
    user: scrubUser(event.user),
    extra,
    breadcrumbs,
  };
}

function scrubRequest(request: SentryRequestLike | undefined): SentryRequestLike | undefined {
  if (!request) return undefined;
  const parsed = requestSchema.safeParse(request);
  if (!parsed.success) {
    return { method: request.method, url: scrubUrl(request.url) };
  }
  const headers = redactHeaders(parsed.data.headers);
  const url = scrubUrl(parsed.data.url);
  if (!headers) return { method: parsed.data.method, url };
  return { method: parsed.data.method, url, headers };
}

function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url
    .replace(/\/(accept|link)\/[^/?#]+/gi, "/$1/[Filtered]")
    .replace(
      /([?&])([^&=]*(?:token|authorization|bearer|secret|password|cookie|email|credential)[^&=]*)=[^&]*/gi,
      "$1$2=[Filtered]",
    );
}

function scrubUser(user: SentryUserLike | null | undefined): SentryUserLike | undefined {
  const parsed = userSchema.safeParse(user);
  if (!parsed.success || parsed.data === null) return undefined;
  const id = parsed.data.id;
  if (id === undefined || id === "") return undefined;
  return { id: String(id) };
}

function headersFromRequest(request: SentryRequestLike | undefined): HeaderMap | undefined {
  if (!request) return undefined;
  const parsed = requestSchema.safeParse(request);
  if (!parsed.success) return undefined;
  return normalizeHeaders(parsed.data.headers);
}

function redactHeaders(headers: z.infer<typeof headersSchema> | undefined): HeaderMap | undefined {
  const normalized = normalizeHeaders(headers);
  if (!normalized) return undefined;
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(normalized)) {
    next[key] = SENSITIVE_HEADER_NAMES.has(key.toLowerCase()) ? "[Filtered]" : value;
  }
  return next;
}

function normalizeHeaders(
  headers: z.infer<typeof headersSchema> | undefined,
): Record<string, string> | undefined {
  if (!headers) return undefined;
  return Array.isArray(headers) ? Object.fromEntries(headers) : headers;
}

function redactFields(fields: z.infer<typeof extraSchema>): LogFields {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[Filtered]" : value,
    ]),
  );
}
