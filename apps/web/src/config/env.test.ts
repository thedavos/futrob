import { describe, expect, it } from "vite-plus/test";
import { parseAppEnv } from "@/config/env.ts";

describe("parseAppEnv trusted origins", () => {
  it("parses comma-separated BETTER_AUTH_TRUSTED_ORIGINS", () => {
    const env = parseAppEnv({
      APP_BASE_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000, https://futrob.app",
      EA_CLUBS_BASE_URL: "https://proclubs.ea.com/api/fc",
      INTERNAL_JOB_SECRET: "job",
    });

    expect(env.BETTER_AUTH_TRUSTED_ORIGINS).toEqual([
      "http://localhost:3000",
      "https://futrob.app",
    ]);
  });

  it("defaults trusted origins to localhost when unset", () => {
    const env = parseAppEnv({});
    expect(env.BETTER_AUTH_TRUSTED_ORIGINS).toEqual(["http://localhost:3000"]);
  });
});
