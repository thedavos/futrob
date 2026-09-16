import { FutrobApiError, type FutrobClient } from "@futrob/sdk";
import type {
  AuthorizationScopeDto,
  EffectiveAccessDto,
  PermissionDto,
} from "@futrob/api-contracts";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { getSession, type Session } from "@/modules/identity/session-store";
import { HOME_ROUTE, LOGIN_ROUTE } from "@/modules/identity/session-gate";
import {
  EffectiveAccessHttpError,
  SHELL_PERMISSIONS,
  capabilityStateFromQuery,
  presentShellAccess,
  type CapabilityState,
  type ShellCatalogItem,
} from "./permissions.ts";

export { HOME_ROUTE, LOGIN_ROUTE };

export type ShellOnboarding = {
  readonly completed: boolean;
  readonly currentStep: string | null;
};

export type HomeShellSnapshot = {
  readonly kind: "home";
  readonly destination: typeof HOME_ROUTE;
  readonly session: Session;
  readonly onboarding: ShellOnboarding | null;
  readonly organizationId: string | undefined;
  readonly capability: CapabilityState;
  readonly nav: readonly ShellCatalogItem[];
  readonly commands: readonly ShellCatalogItem[];
  readonly accessRetryable: boolean;
};

export type AuthenticatedShellSnapshot =
  | { readonly kind: "login"; readonly destination: typeof LOGIN_ROUTE }
  | HomeShellSnapshot;

function loginSnapshot(): AuthenticatedShellSnapshot {
  return { kind: "login", destination: LOGIN_ROUTE };
}

async function loadEffectiveAccess(
  client: FutrobClient,
  scope: AuthorizationScopeDto,
  permissions: readonly PermissionDto[],
): Promise<EffectiveAccessDto> {
  try {
    return await client.authorization.getEffectiveAccess(scope, permissions);
  } catch (error) {
    if (error instanceof FutrobApiError) {
      throw new EffectiveAccessHttpError(error.status);
    }
    throw error;
  }
}

function homeSnapshot(input: {
  readonly session: Session;
  readonly onboarding: ShellOnboarding | null;
  readonly organizationId: string | undefined;
  readonly capability: CapabilityState;
}): HomeShellSnapshot {
  const presented = presentShellAccess({
    organizationId: input.organizationId,
    capability: input.capability,
  });
  return {
    kind: "home",
    destination: HOME_ROUTE,
    session: input.session,
    onboarding: input.onboarding,
    organizationId: input.organizationId,
    capability: input.capability,
    nav: presented.nav,
    commands: presented.commands,
    accessRetryable: presented.accessRetryable,
  };
}

export async function loadAuthenticatedShell(
  client: FutrobClient = getFutrobClient(),
): Promise<AuthenticatedShellSnapshot> {
  let session: Session | null;
  try {
    session = await getSession();
  } catch {
    return loginSnapshot();
  }
  if (!session) return loginSnapshot();

  let onboarding: ShellOnboarding | null = null;
  try {
    const status = await client.identity.getOnboardingStatus();
    onboarding = { completed: status.completed, currentStep: status.currentStep };
  } catch (error) {
    if (error instanceof FutrobApiError && error.status === 401) return loginSnapshot();
  }

  let organizationId: string | undefined;
  try {
    const mine = await client.organizations.listMine();
    organizationId = mine.memberships[0]?.organizationId;
  } catch (error) {
    if (error instanceof FutrobApiError && error.status === 401) return loginSnapshot();
  }

  const scope: AuthorizationScopeDto = organizationId ? { organizationId } : {};
  try {
    const access = await loadEffectiveAccess(client, scope, SHELL_PERMISSIONS);
    return homeSnapshot({
      session,
      onboarding,
      organizationId,
      capability: capabilityStateFromQuery({ fetchStatus: "success", data: access }),
    });
  } catch (error) {
    if (error instanceof EffectiveAccessHttpError && error.status === 401) {
      return loginSnapshot();
    }
    return homeSnapshot({
      session,
      onboarding,
      organizationId,
      capability: capabilityStateFromQuery({ fetchStatus: "error", data: undefined }),
    });
  }
}
