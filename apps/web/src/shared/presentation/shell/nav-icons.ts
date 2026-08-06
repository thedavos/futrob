import type { Icon } from "@futrob/ui";
import {
  Buildings,
  ChartBar,
  GameController,
  Gear,
  House,
  Ticket,
  Trophy,
  Users,
  UsersThree,
} from "@phosphor-icons/react";
import type { ShellNavIconId } from "./nav-registry.ts";

export const SHELL_NAV_ICONS: Record<ShellNavIconId, Icon> = {
  home: House,
  competitions: Trophy,
  "ea-clubs": GameController,
  "pro-stats": ChartBar,
  invitations: Ticket,
  teams: Users,
  players: UsersThree,
  organization: Buildings,
  settings: Gear,
};
