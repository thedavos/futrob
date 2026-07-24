/** Auth subject provider key stored in `identity_subjects.provider`. */
export const CREDENTIAL_IDENTITY_PROVIDER = "credential" as const;

export type IdentityProviderKey = typeof CREDENTIAL_IDENTITY_PROVIDER | (string & {});
