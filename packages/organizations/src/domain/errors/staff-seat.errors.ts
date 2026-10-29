import { TaggedError } from "@futrob/shared-kernel";

/** The plan only stops adding staff; existing staff keep their roles after a downgrade. */
export class OrganizationStaffLimitReached extends TaggedError("OrganizationStaffLimitReached")<{
  code: "organizations.staff_limit_reached";
  message: string;
  max: number;
}> {}
