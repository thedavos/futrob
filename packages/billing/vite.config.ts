import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "billing",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
