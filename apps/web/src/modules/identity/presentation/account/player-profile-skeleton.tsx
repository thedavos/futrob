import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Skeleton, vis } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./account.styles.ts";

const ACCOUNT_ROWS = [0, 1] as const;

const bones = stylex.create({
  region: {
    width: "100%",
    minWidth: 0,
  },
  hintCopy: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  hintLine: {
    width: "22rem",
    height: "0.75rem",
  },
  hintLineShort: {
    width: "14rem",
    height: "0.75rem",
  },
  avatar: {
    width: "4rem",
    height: "4rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  field: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.5rem",
  },
  nameLabel: {
    width: "7.5rem",
    height: "0.75rem",
  },
  emailLabel: {
    width: "9.5rem",
    height: "0.75rem",
  },
  input: {
    width: "100%",
    height: "var(--control-height)",
  },
  emailHint: {
    width: "70%",
    maxWidth: "18rem",
    height: "0.75rem",
  },
  save: {
    width: "9.5rem",
    height: "var(--control-height)",
    flexShrink: 0,
  },
  identifier: {
    width: "8rem",
    maxWidth: "100%",
    height: "1.25rem",
  },
  accountMeta: {
    width: "10rem",
    maxWidth: "100%",
    height: "0.75rem",
  },
  accountItem: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.25rem",
  },
});

function LoadingStatus({ children }: { readonly children: ReactNode }) {
  const { t } = useI18n();
  const label = t("profile.loading");
  return (
    <div aria-busy="true" aria-label={label} {...applyStyles(bones.region)}>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      {children}
    </div>
  );
}

export function PlayerProfileIdentitySkeleton() {
  return (
    <LoadingStatus>
      <div aria-hidden="true" {...applyStyles(styles.stack)}>
        <div {...applyStyles(styles.row)}>
          <Skeleton {...applyStyles(bones.avatar)} />
          <div {...applyStyles(bones.hintCopy)}>
            <Skeleton {...applyStyles(bones.hintLine)} />
            <Skeleton {...applyStyles(bones.hintLineShort)} />
          </div>
        </div>
        <div {...applyStyles(bones.field)}>
          <Skeleton {...applyStyles(bones.nameLabel)} />
          <Skeleton {...applyStyles(bones.input)} />
        </div>
        <div {...applyStyles(bones.field)}>
          <Skeleton {...applyStyles(bones.emailLabel)} />
          <Skeleton {...applyStyles(bones.input)} />
          <Skeleton {...applyStyles(bones.emailHint)} />
        </div>
        <div {...applyStyles(styles.actions)}>
          <Skeleton {...applyStyles(bones.save)} />
        </div>
      </div>
    </LoadingStatus>
  );
}

export function PlayerProfileAccountsSkeleton() {
  return (
    <LoadingStatus>
      <ul aria-hidden="true" {...applyStyles(styles.section)}>
        {ACCOUNT_ROWS.map((index) => (
          <li key={index} {...applyStyles(bones.accountItem)}>
            <Skeleton {...applyStyles(bones.identifier)} />
            <Skeleton {...applyStyles(bones.accountMeta)} />
          </li>
        ))}
      </ul>
    </LoadingStatus>
  );
}
