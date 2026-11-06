import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { OrganizationPlan } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  freeEntitlementsFixture,
  leagueEntitlementsFixture,
  proEntitlementsFixture,
} from "./organization-plan.fixtures.ts";
import { PricingPage } from "./pricing-page.tsx";

const PLANS: readonly OrganizationPlan[] = [
  { key: "free", version: 1, entitlements: freeEntitlementsFixture },
  { key: "pro", version: 1, entitlements: proEntitlementsFixture },
  { key: "league", version: 1, entitlements: leagueEntitlementsFixture },
];

function PricingStory({ plans }: { readonly plans: readonly OrganizationPlan[] | null }) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const route = createRoute({
      getParentRoute: () => rootRoute,
      path: "/pricing",
      component: () => <PricingPage plans={plans} />,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ["/pricing"] }),
    });
  }, [plans]);
  return (
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Organization/Pricing",
  component: PricingStory,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PricingStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Catalog: Story = { args: { plans: PLANS } };
export const CatalogUnavailable: Story = { args: { plans: null } };
