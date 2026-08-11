import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "scheduling",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
