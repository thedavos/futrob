import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "notifications",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
