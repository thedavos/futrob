/**
 * Cross-context source of current time.
 *
 * Application use cases depend on this port so production and tests can
 * provide deterministic clock adapters.
 */
export interface ClockPort {
  now(): Date;
}
