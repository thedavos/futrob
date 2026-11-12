import { describe, expect, it } from "vite-plus/test";
import { buildAuthEnv, parseTrustedOrigins } from "./auth-env.ts";

describe("buildAuthEnv", () => {
  const validEnv = {
    APP_BASE_URL: "https://futrob.app",
    BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
    BETTER_AUTH_TRUSTED_ORIGINS: "https://futrob.app",
  } as const;

  it("uses APP_BASE_URL as the default Better Auth origin", () => {
    const env = buildAuthEnv(validEnv);

    expect(env.BETTER_AUTH_URL).toBe("https://futrob.app");
    expect(env.BETTER_AUTH_TRUSTED_ORIGINS).toEqual(["https://futrob.app"]);
  });

  it("normalizes configured origins", () => {
    const env = buildAuthEnv({
      ...validEnv,
      APP_BASE_URL: "https://futrob.app/",
      BETTER_AUTH_URL: "https://auth.futrob.app/",
    });
    expect(env.BETTER_AUTH_URL).toBe("https://auth.futrob.app");
  });

  it("honors an explicit trusted-origins list", () => {
    const env = buildAuthEnv({
      ...validEnv,
      BETTER_AUTH_TRUSTED_ORIGINS: "https://futrob.app, https://preview.futrob.app",
    });
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

  it("rejects missing or short secrets", () => {
    expect(() => buildAuthEnv({ ...validEnv, BETTER_AUTH_SECRET: "too-short" })).toThrow(
      "BETTER_AUTH_SECRET",
    );
  });

  it("rejects missing trusted origins instead of trusting the request host", () => {
    expect(() => buildAuthEnv({ ...validEnv, BETTER_AUTH_TRUSTED_ORIGINS: undefined })).toThrow(
      "BETTER_AUTH_TRUSTED_ORIGINS",
    );
  });

  it("rejects origins with paths, credentials, or non-HTTP protocols", () => {
    expect(() => buildAuthEnv({ ...validEnv, APP_BASE_URL: "https://futrob.app/auth" })).toThrow(
      "APP_BASE_URL",
    );
    expect(() =>
      buildAuthEnv({
        ...validEnv,
        BETTER_AUTH_TRUSTED_ORIGINS: "https://user:secret@futrob.app",
      }),
    ).toThrow("BETTER_AUTH_TRUSTED_ORIGINS");
    expect(() => buildAuthEnv({ ...validEnv, BETTER_AUTH_URL: "javascript:alert(1)" })).toThrow(
      "BETTER_AUTH_URL",
    );
  });

  it("requires a Resend key and sender when account email goes through Resend", () => {
    expect(buildAuthEnv(validEnv).AUTH_EMAIL).toEqual({ delivery: "disabled" });
    expect(() => buildAuthEnv({ ...validEnv, AUTH_EMAIL_DELIVERY: "resend" })).toThrow(
      "RESEND_API_KEY",
    );
    expect(
      buildAuthEnv({
        ...validEnv,
        AUTH_EMAIL_DELIVERY: "resend",
        RESEND_API_KEY: "re_synthetic",
        EMAIL_FROM: "Futrob <cuenta@futrob.app>",
      }).AUTH_EMAIL,
    ).toEqual({ delivery: "resend", apiKey: "re_synthetic", from: "Futrob <cuenta@futrob.app>" });
    expect(() => buildAuthEnv({ ...validEnv, AUTH_EMAIL_DELIVERY: "smtp" })).toThrow(
      "AUTH_EMAIL_DELIVERY",
    );
  });
});
