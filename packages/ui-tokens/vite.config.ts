import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "ui-tokens",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
