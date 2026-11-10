import {
  getEmailPreferencesResponseSchema,
  saveEmailPreferencesRequestSchema,
  saveEmailPreferencesResponseSchema,
  unsubscribeEmailResponseSchema,
  type EmailPreferencesDto,
  type UnsubscribeEmailResponse,
} from "@futrob/api-contracts";
import type { z } from "zod";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";
import { ActivityClientError } from "./activity-browser-client.ts";

function requestEmailJson<T>(input: {
  readonly path: string;
  readonly method: "GET" | "POST" | "PUT";
  readonly body?: unknown;
  readonly schema: z.ZodType<T>;
}): Promise<T> {
  return requestBrowserJson({
    ...input,
    fallbackCode: "notifications.client_error",
    createError: (status, error) =>
      new ActivityClientError(status, error.code, error.requestId, error.retryAfterSeconds),
  });
}

/** Email channel settings through the web BFF (ADR-0028). */
export const emailBrowserClient = {
  getPreferences(): Promise<EmailPreferencesDto> {
    return requestEmailJson({
      path: "/api/v1/notifications/email-preferences",
      method: "GET",
      schema: getEmailPreferencesResponseSchema,
    });
  },
  savePreferences(input: EmailPreferencesDto): Promise<EmailPreferencesDto> {
    return requestEmailJson({
      path: "/api/v1/notifications/email-preferences",
      method: "PUT",
      body: saveEmailPreferencesRequestSchema.parse(input),
      schema: saveEmailPreferencesResponseSchema,
    });
  },
  unsubscribe(token: string): Promise<UnsubscribeEmailResponse> {
    return requestEmailJson({
      path: "/api/v1/public/email/unsubscribe",
      method: "POST",
      body: { token },
      schema: unsubscribeEmailResponseSchema,
    });
  },
};
