import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "public-portal",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
