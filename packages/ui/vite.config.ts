import { defineConfig } from "vite-plus";

import { futrobStylex } from "../../tools/stylex/vite-plugin.ts";

export default defineConfig({
  plugins: [futrobStylex()],
  test: {
    name: "ui",
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
