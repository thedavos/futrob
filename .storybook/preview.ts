import type { Preview } from "@storybook/react-vite";

import "../packages/ui/src/storybook.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "Futrob light",
      values: [
        { name: "Futrob light", value: "#f7faf8" },
        { name: "Surface", value: "#ffffff" },
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
