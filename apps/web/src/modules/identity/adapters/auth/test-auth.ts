import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import { CREDENTIAL_IDENTITY_PROVIDER, type ActorProvisionerPort } from "@futrob/identity";
import { createSessionIdentityAdapter } from "./session-identity.adapter.ts";
import { credentialSubject } from "./actor-provisioner.ts";

/** In-memory ActorProvisioner for unit tests (no D1). */
export function createMemoryActorProvisioner(): ActorProvisionerPort & {
  readonly store: Map<string, ActorId>;
} {
  const store = new Map<string, ActorId>();
  return {
    store,
    async ensureActorForSubject(input) {
      const key = `${input.provider}:${input.subject}`;
      const existing = store.get(key);
      if (existing) {
        return existing;
      }
      const actorId = asActorId(`actor_${store.size + 1}`);
      store.set(key, actorId);
      return actorId;
    },
  };
}

export function createMemoryAuth(input: {
  readonly secret?: string;
  readonly baseURL?: string;
  readonly actorProvisioner?: ActorProvisionerPort;
}) {
  const secret = input.secret ?? "test-secret-at-least-32-characters!!";
  const baseURL = input.baseURL ?? "http://localhost:3000";
  const actorProvisioner = input.actorProvisioner;

  return betterAuth({
    appName: "Futrob",
    baseURL,
    secret,
    trustedOrigins: [baseURL],
    database: memoryAdapter({
      user: [],
      session: [],
      account: [],
      verification: [],
    }),
    emailAndPassword: {
      enabled: true,
    },
    databaseHooks: actorProvisioner
      ? {
          user: {
            create: {
              after: async (user) => {
                await actorProvisioner.ensureActorForSubject(credentialSubject(user.id));
              },
            },
          },
        }
      : undefined,
  });
}

export function createMemorySessionIdentity(input: {
  readonly actorProvisioner: ActorProvisionerPort & { readonly store: Map<string, ActorId> };
}) {
  const auth = createMemoryAuth({ actorProvisioner: input.actorProvisioner });
  return {
    auth,
    sessionIdentity: createSessionIdentityAdapter({
      auth,
      findActorId: async (userId) =>
        input.actorProvisioner.store.get(`${CREDENTIAL_IDENTITY_PROVIDER}:${userId}`) ?? null,
    }),
    provider: CREDENTIAL_IDENTITY_PROVIDER,
  };
}
