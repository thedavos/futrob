import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";

type MasterDetailProps = React.ComponentProps<"div"> & {
  readonly master: React.ReactNode;
  readonly detail: React.ReactNode;
  /** When set on small screens, shows detail full-bleed instead of the master list. */
  readonly selectedId?: string | null;
};

const styles = stylex.create({
  root: {
    display: "flex",
    minHeight: 0,
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
  },
  master: {
    minHeight: 0,
    width: {
      default: "100%",
      [media.md]: "20rem",
      [media.lg]: "24rem",
    },
    flexShrink: 0,
    flexDirection: "column",
    overflowY: "auto",
    borderRightWidth: {
      default: 0,
      [media.md]: 1,
    },
    borderRightStyle: "solid",
    borderRightColor: colors.border,
  },
  masterVisible: {
    display: "flex",
  },
  masterHiddenOnMobile: {
    display: {
      default: "none",
      [media.md]: "flex",
    },
  },
  detail: {
    minHeight: 0,
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    overflowY: "auto",
  },
  detailVisible: {
    display: "flex",
    flexDirection: "column",
  },
  detailHiddenOnMobile: {
    display: {
      default: "none",
      [media.md]: "flex",
    },
    flexDirection: "column",
  },
});

function MasterDetail({
  className,
  style,
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
      {...applyHost(className, style, styles.root)}
      {...props}
    >
      <div
        data-slot="master-detail-master"
        {...applyHost(
          undefined,
          undefined,
          styles.master,
          showDetailMobile ? styles.masterHiddenOnMobile : styles.masterVisible,
        )}
      >
        {master}
      </div>
      <div
        data-slot="master-detail-detail"
        {...applyHost(
          undefined,
          undefined,
          styles.detail,
          showDetailMobile ? styles.detailVisible : styles.detailHiddenOnMobile,
        )}
      >
        {detail}
      </div>
    </div>
  );
}

export { MasterDetail };
export type { MasterDetailProps };
