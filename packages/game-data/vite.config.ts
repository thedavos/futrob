import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "game-data",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
