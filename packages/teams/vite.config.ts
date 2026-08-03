import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "teams",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
