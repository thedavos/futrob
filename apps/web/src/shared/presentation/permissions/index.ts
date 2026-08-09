/**
 * Presentation permission helpers. Server EffectiveAccess remains the authority;
 * these only gate UI against a fail-closed allowed set.
 */
export { can, canAll, canAny } from "./can.ts";
export { useCan, useCapabilities, type CanQuery, type CapabilitiesQuery } from "./use-can.ts";
