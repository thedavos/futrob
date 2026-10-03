import { createFileRoute } from "@tanstack/react-router";
import { NewOrganizationPage } from "@/modules/organizations/presentation/new-organization-page.tsx";

export const Route = createFileRoute("/_app/orgs/new")({ component: NewOrganizationPage });
