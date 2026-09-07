/// <reference path="./styles.d.ts" />
import { themeToHexColors } from "@futrob/ui-tokens";
import type { Preview } from "@storybook/react-vite";

import "../packages/ui/src/storybook.css";

const palette = themeToHexColors();

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
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default preview;
