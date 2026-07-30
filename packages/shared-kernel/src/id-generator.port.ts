/**
 * Cross-context source of opaque unique identifiers.
 *
 * Bounded contexts apply their own branded identifier constructors after
 * generation.
 */
export interface IdGeneratorPort {
  generate(): string;
}
