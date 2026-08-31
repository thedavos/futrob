import type { Icon } from "@phosphor-icons/react";

export type FutrobIconEntry = {
  readonly name: string;
  readonly label: string;
  readonly usage: string;
  readonly Icon: Icon;
};

export { FUTROB_ICON_CATALOG } from "./catalog-entries.ts";
