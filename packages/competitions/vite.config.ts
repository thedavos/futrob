import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "competitions",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
