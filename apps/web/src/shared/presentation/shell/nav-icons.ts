import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Gamepad2,
  Home,
  Settings,
  TicketCheck,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import type { ShellNavIconId } from "./nav-registry.ts";

export const SHELL_NAV_ICONS: Record<ShellNavIconId, LucideIcon> = {
  home: Home,
  competitions: Trophy,
  "ea-clubs": Gamepad2,
  invitations: TicketCheck,
  teams: Users,
  players: UsersRound,
  organization: Building2,
  settings: Settings,
};
