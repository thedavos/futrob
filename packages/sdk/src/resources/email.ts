import {
  getEmailPreferencesResponseSchema,
  saveEmailPreferencesResponseSchema,
  unsubscribeEmailResponseSchema,
  type GetEmailPreferencesResponse,
  type SaveEmailPreferencesRequest,
  type SaveEmailPreferencesResponse,
  type UnsubscribeEmailResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/** Email channel settings (ADR-0030). */
export function createEmailResource(http: HttpClient) {
  return {
    /** The actor's email locale and non-critical opt-out; defaults when never saved. */
    async getPreferences(options: RequestOptions = {}): Promise<GetEmailPreferencesResponse> {
      return http.request({
        path: apiPath("notifications", "email-preferences"),
        method: "GET",
        options,
        parse: (data) => getEmailPreferencesResponseSchema.parse(data),
      });
    },
    async savePreferences(
      body: SaveEmailPreferencesRequest,
      options: RequestOptions = {},
    ): Promise<SaveEmailPreferencesResponse> {
      return http.request({
        path: apiPath("notifications", "email-preferences"),
        method: "PUT",
        body,
        options,
        parse: (data) => saveEmailPreferencesResponseSchema.parse(data),
      });
    },
    /** Anonymous: the token of an unsubscribe link turns non-critical email off. */
    async unsubscribe(
      token: string,
      options: RequestOptions = {},
    ): Promise<UnsubscribeEmailResponse> {
      return http.request({
        path: apiPath("public", "email", "unsubscribe"),
        method: "POST",
        body: { token },
        options,
        parse: (data) => unsubscribeEmailResponseSchema.parse(data),
      });
    },
  };
}

export type EmailResource = ReturnType<typeof createEmailResource>;
