import { describe, expect, it } from "vite-plus/test";
import { buildAuthEnv, parseTrustedOrigins } from "./auth-env.ts";

describe("buildAuthEnv", () => {
  it("uses APP_BASE_URL as public origin and cookie base URL", () => {
    const env = buildAuthEnv(
      {
        APP_BASE_URL: "https://futrob.app",
        BETTER_AUTH_SECRET: "secret",
      },
      "https://futrob-auth.futrob-workers.workers.dev",
    );

    expect(env.BETTER_AUTH_URL).toBe("https://futrob.app");
    expect(env.BETTER_AUTH_TRUSTED_ORIGINS).toEqual([
      "https://futrob.app",
      "https://futrob-auth.futrob-workers.workers.dev",
    ]);
  });

  it("does not inject localhost when APP_BASE_URL is set", () => {
    const env = buildAuthEnv(
      { APP_BASE_URL: "https://futrob.app" },
      "https://futrob-auth.example.workers.dev",
    );
    expect(env.BETTER_AUTH_TRUSTED_ORIGINS).not.toContain("http://localhost:3000");
  });

  it("treats empty BETTER_AUTH_URL as missing", () => {
    const env = buildAuthEnv(
      {
        APP_BASE_URL: "http://localhost:3000",
        BETTER_AUTH_URL: "  ",
      },
      "http://localhost:8788",
    );
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("honors an explicit trusted-origins list", () => {
    const env = buildAuthEnv(
      {
        APP_BASE_URL: "https://futrob.app",
        BETTER_AUTH_TRUSTED_ORIGINS: "https://futrob.app, https://preview.futrob.app",
      },
      "https://futrob-auth.futrob-workers.workers.dev",
    );
    expect(env.BETTER_AUTH_TRUSTED_ORIGINS).toEqual([
      "https://futrob.app",
      "https://preview.futrob.app",
    ]);
  });

  it("splits and trims origin lists", () => {
    expect(parseTrustedOrigins(" https://a.test , ,https://b.test ")).toEqual([
      "https://a.test",
      "https://b.test",
    ]);
  });
});
