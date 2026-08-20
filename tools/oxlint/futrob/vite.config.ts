import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "futrob-oxlint-rules",
    environment: "node",
    include: ["rules/**/*.{test,spec}.ts"],
  },
});
