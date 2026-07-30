import { createHash, randomBytes } from "node:crypto";
import type { InvitationTokenPort } from "@futrob/organizations";
import type { ClockPort, IdGeneratorPort } from "@futrob/shared-kernel";

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

export class CryptoIdGenerator implements IdGeneratorPort {
  generate(): string {
    return crypto.randomUUID();
  }
}

export class Sha256InvitationTokenPort implements InvitationTokenPort {
  generatePlainToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
