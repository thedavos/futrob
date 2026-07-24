import { parseAppEnv } from "@/config/env.ts";
import { defaultFeatureFlags } from "@/config/feature-flags.ts";
import type { RuntimeConfig } from "@/config/runtime-config.ts";
import { SystemClock } from "@/shared/application/clock.ts";
import { CryptoIdGenerator } from "@/shared/application/id-generator.ts";

import type { AppD1Database } from "@/shared/infrastructure/d1.ts";

export interface CloudflareBindings {
  readonly APP_DB: AppD1Database | undefined;
  readonly MEDIA_BUCKET: unknown;
  readonly JOB_QUEUE: unknown;
}

export interface AppContext {
  readonly config: RuntimeConfig;
  readonly clock: SystemClock;
  readonly ids: CryptoIdGenerator;
  readonly bindings: CloudflareBindings;
}

export function createAppContext(input: {
  readonly envVars: Record<string, string | undefined>;
  readonly bindings: CloudflareBindings;
}): AppContext {
  return {
    config: {
      env: parseAppEnv(input.envVars),
      flags: defaultFeatureFlags,
    },
    clock: new SystemClock(),
    ids: new CryptoIdGenerator(),
    bindings: input.bindings,
  };
}
