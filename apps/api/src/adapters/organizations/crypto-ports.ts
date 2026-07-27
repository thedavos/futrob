import { createHash, randomBytes } from "node:crypto";
import { asOrganizationId, type OrganizationId } from "@futrob/shared-kernel";
import type { ClockPort, IdGeneratorPort, TokenPort } from "@futrob/organizations";

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

export class CryptoIdGenerator implements IdGeneratorPort {
  organizationId(): OrganizationId {
    return asOrganizationId(crypto.randomUUID());
  }

  invitationId(): string {
    return crypto.randomUUID();
  }
}

export class Sha256TokenPort implements TokenPort {
  generatePlainToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
