import type { Icon } from "@futrob/ui";
import {
  BuildingsIcon,
  ChartBarIcon,
  GameControllerIcon,
  GearIcon,
  HouseIcon,
  ListBulletsIcon,
  TicketIcon,
  TrophyIcon,
  UsersIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import type { ShellNavIconId } from "./nav-registry.ts";

export const SHELL_NAV_ICONS: Record<ShellNavIconId, Icon> = {
  home: HouseIcon,
  competitions: TrophyIcon,
  "ea-clubs": GameControllerIcon,
  matches: ListBulletsIcon,
  statistics: ChartBarIcon,
  invitations: TicketIcon,
  teams: UsersIcon,
  players: UsersThreeIcon,
  organization: BuildingsIcon,
  settings: GearIcon,
};
