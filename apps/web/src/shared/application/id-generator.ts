import type { IdGeneratorPort } from "@futrob/shared-kernel";

export class CryptoIdGenerator implements IdGeneratorPort {
  generate(): string {
    return crypto.randomUUID();
  }
}
