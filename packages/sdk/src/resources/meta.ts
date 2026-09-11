import {
  healthResponseSchema,
  pingResponseSchema,
  type HealthResponse,
  type PingResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";

export function createMetaResource(http: HttpClient) {
  return {
    async ping(options: RequestOptions = {}): Promise<PingResponse> {
      return http.request({
        path: "/meta/ping",
        method: "GET",
        options,
        parse: (data) => pingResponseSchema.parse(data),
      });
    },
    async health(options: RequestOptions = {}): Promise<HealthResponse> {
      return http.request({
        path: "/meta/health",
        method: "GET",
        options,
        parse: (data) => healthResponseSchema.parse(data),
      });
    },
  };
}

export type MetaResource = ReturnType<typeof createMetaResource>;
