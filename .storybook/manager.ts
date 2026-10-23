import { addons } from "storybook/manager-api";

import { futrobTheme, palette } from "./futrob-theme.ts";

addons.setConfig({
  theme: futrobTheme,
});

// Storybook paints the selected sidebar item with a darkened `colorSecondary` and white
// text, which fails contrast on lime. Use the app sidebar's own selected pair instead.
// `!important` is needed to beat the manager's emotion `&&:hover` selectors.
const sidebarSelection = document.createElement("style");
sidebarSelection.textContent = `
  .sidebar-item[data-selected="true"] {
    background: ${palette["sidebar-accent"]} !important;
    color: ${palette["sidebar-accent-foreground"]} !important;
  }
  .sidebar-item[data-selected="true"] svg {
    color: ${palette["sidebar-accent-foreground"]} !important;
  }
`;
document.head.append(sidebarSelection);
