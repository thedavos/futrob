/** SHA-256 of the canonical command's UTF-8 bytes, as 64 lowercase hexadecimal digits. */
export interface SelectionCommandDigestPort {
  sha256(canonicalCommand: string): string;
}
