import { useMemo, type ReactNode } from "react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { LoginForm } from "@/modules/identity/presentation/login-form.tsx";
import { SignupForm } from "@/modules/identity/presentation/signup-form.tsx";

function AuthStoryShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-6 sm:p-8">
      {children}
    </div>
  );
}

function StubPage({ label }: { label: string }) {
  return (
    <AuthStoryShell>
      <p className="typo-body text-muted-foreground">{label}</p>
    </AuthStoryShell>
  );
}

function createAuthStoryRouter(initialPath: "/login" | "/signup") {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: () => (
      <AuthStoryShell>
        <AuthFormHeader description="Continúa gestionando tu competición." title="Inicia sesión" />
        <LoginForm />
      </AuthStoryShell>
    ),
  });

  const signupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/signup",
    component: () => (
      <AuthStoryShell>
        <AuthFormHeader
          description="Empieza gratis y organiza tu competición con más control, orden y transparencia."
          title="Crea tu cuenta"
        />
        <SignupForm />
      </AuthStoryShell>
    ),
  });

  const onboardingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/onboarding",
    component: () => <StubPage label="Onboarding (stub de Storybook)" />,
  });

  const orgsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/orgs",
    component: () => <StubPage label="Organizaciones (stub de Storybook)" />,
  });

  const orgRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/orgs/$orgId",
    component: () => <StubPage label="Organización (stub de Storybook)" />,
  });

  const routeTree = rootRoute.addChildren([
    loginRoute,
    signupRoute,
    onboardingRoute,
    orgsRoute,
    orgRoute,
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

export function AuthRouterDecorator({ initialPath }: { initialPath: "/login" | "/signup" }) {
  const router = useMemo(() => createAuthStoryRouter(initialPath), [initialPath]);
  return <RouterProvider router={router} />;
}
