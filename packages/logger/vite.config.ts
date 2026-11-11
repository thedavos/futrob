import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "logger",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
