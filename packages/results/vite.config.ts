import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "results",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
