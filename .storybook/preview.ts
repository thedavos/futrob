import type { Preview } from "@storybook/react-vite";

import "../packages/ui/src/storybook.css";
import { futrobTheme, palette } from "./futrob-theme.ts";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "Grafito + Lima",
      values: [
        { name: "Grafito + Lima", value: palette.background },
        { name: "Surface", value: palette.surface },
      ],
    },
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: { theme: futrobTheme },
    layout: "centered",
    options: {
      // Sidebar order: design system first, then product by actor and flow.
      // Unlisted entries keep their file order after the listed ones.
      storySort: {
        order: [
          "Foundations",
          ["Typography", "Icons", "Logo"],
          "Components",
          [
            "Typography",
            "Actions",
            "Forms",
            "Feedback",
            "Overlays",
            "Data display",
            "Navigation",
            "Layout",
          ],
          "Patterns",
          "Product",
          [
            "Shell",
            "Shared",
            "Auth",
            "Onboarding",
            [
              "Flow",
              "Shell",
              "Intention",
              "Game account",
              "Club",
              "Organization",
              "Competition",
              "Invitation",
              "Review",
            ],
            "Organizer",
            [
              "Home",
              "Organization",
              ["Create", "Settings", "Members and roles"],
              "Teams",
              "Competition setup",
              [
                "Create",
                "Rules step",
                "Format estimate",
                "Participants",
                "Invite team",
                "Review step",
                "Action bar",
              ],
            ],
            "Competition",
            [
              "Rules",
              "Teams console",
              "Entry invitation",
              "Captain",
              "Encounters",
              "Encounter",
              "Rescheduling",
              "Standings",
              "Player rankings",
              "Team statistics",
              "Team performance",
            ],
            "Player",
            [
              "Home",
              "Competitions",
              ["Mine", "Explore", "Detail"],
              "Invitations",
              "Game accounts",
              "Matches",
              ["List", "Detail", "Record"],
              "Statistics",
              ["Overview", "Attributes"],
            ],
            "Notifications",
          ],
        ],
      },
    },
  },
};

export default preview;
