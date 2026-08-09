import type { AuthorizationPort } from "@futrob/shared-kernel";

export const allowAllAuthorization: AuthorizationPort = {
  decide: async (request) => ({ ...request, allowed: true, reason: "allowed" }),
  getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
};
