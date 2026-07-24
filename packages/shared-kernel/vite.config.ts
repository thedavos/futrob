import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "shared-kernel",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
