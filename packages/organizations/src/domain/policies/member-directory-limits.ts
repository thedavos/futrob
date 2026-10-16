/** Successful directory size. Persistence reads one extra row to detect overflow. */
export const MEMBER_DIRECTORY_MEMBER_LIMIT = 500;

/**
 * Competitions folded in memory for one directory read.
 * The catalog query asks for one extra row and fails closed above this ceiling.
 */
export const MEMBER_DIRECTORY_CATALOG_LIMIT = 100;
