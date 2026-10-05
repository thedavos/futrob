import { createHash } from "node:crypto";
import type { SelectionCommandDigestPort } from "@futrob/results";

export class NodeSelectionCommandDigest implements SelectionCommandDigestPort {
  sha256(canonicalCommand: string): string {
    return createHash("sha256").update(canonicalCommand, "utf8").digest("hex");
  }
}
