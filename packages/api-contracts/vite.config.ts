import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "api-contracts",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
