import { parseAppEnv } from "@/config/env.ts";
import { CryptoIdGenerator } from "@/shared/application/id-generator.ts";

import { createAuth } from "../adapters/auth/better-auth.ts";
import { getWorkerEnv } from "../adapters/auth/worker-env.ts";

/** Better Auth HTTP boundary owned by the identity module. */
export async function handleAuthRequest(request: Request): Promise<Response> {
  const bindings = getWorkerEnv();

  if (!bindings.APP_DB) {
    return Response.json(
      { code: "auth.misconfigured", messageKey: "errors.auth.misconfigured" },
      { status: 503 },
    );
  }

  const appEnv = parseAppEnv({
    APP_BASE_URL: bindings.APP_BASE_URL ?? process.env.APP_BASE_URL,
    BETTER_AUTH_SECRET: bindings.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: bindings.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL,
    BETTER_AUTH_TRUSTED_ORIGINS:
      bindings.BETTER_AUTH_TRUSTED_ORIGINS ?? process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    EA_CLUBS_BASE_URL: process.env.EA_CLUBS_BASE_URL,
    INTERNAL_JOB_SECRET: process.env.INTERNAL_JOB_SECRET,
  });

  try {
    const auth = createAuth({
      d1: bindings.APP_DB,
      env: appEnv,
      ids: new CryptoIdGenerator(),
    });
    return await auth.handler(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "auth failed";
    if (message.includes("BETTER_AUTH_SECRET")) {
      return Response.json(
        { code: "auth.misconfigured", messageKey: "errors.auth.misconfigured" },
        { status: 503 },
      );
    }
    throw error;
  }
}
