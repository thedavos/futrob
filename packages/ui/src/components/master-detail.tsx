import * as React from "react";

import { cn } from "#lib/utils";

type MasterDetailProps = React.ComponentProps<"div"> & {
  readonly master: React.ReactNode;
  readonly detail: React.ReactNode;
  /** When set on small screens, shows detail full-bleed instead of the master list. */
  readonly selectedId?: string | null;
};

function MasterDetail({
  className,
  master,
  detail,
  selectedId = null,
  ...props
}: MasterDetailProps) {
  const showDetailMobile = selectedId != null && selectedId !== "";

  return (
    <div
      data-slot="master-detail"
      data-selected={showDetailMobile ? "true" : undefined}
      className={cn("flex min-h-0 min-w-0 flex-1", className)}
      {...props}
    >
      <div
        data-slot="master-detail-master"
        className={cn(
          "flex min-h-0 w-full shrink-0 flex-col overflow-y-auto border-border md:w-80 md:border-r lg:w-96",
          showDetailMobile ? "hidden md:flex" : "flex",
        )}
      >
        {master}
      </div>
      <div
        data-slot="master-detail-detail"
        className={cn(
          "min-h-0 min-w-0 flex-1 overflow-y-auto",
          showDetailMobile ? "flex flex-col" : "hidden md:flex md:flex-col",
        )}
      >
        {detail}
      </div>
    </div>
  );
}

export { MasterDetail };
export type { MasterDetailProps };
