import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "mobile",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
