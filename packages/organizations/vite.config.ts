import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "organizations",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
