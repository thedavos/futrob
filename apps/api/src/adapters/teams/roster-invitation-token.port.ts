import { createHash, randomBytes } from "node:crypto";
import type { RosterInvitationTokenPort } from "@futrob/teams";

export class Sha256RosterInvitationTokenPort implements RosterInvitationTokenPort {
  generateToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
