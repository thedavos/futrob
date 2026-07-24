import type { GameDataProviderKey } from "./provider-key.ts";

export interface ExternalReference {
  readonly providerKey: GameDataProviderKey;
  readonly externalId: string;
}

export function externalReferenceKey(ref: ExternalReference): string {
  return `${ref.providerKey}:${ref.externalId}`;
}
