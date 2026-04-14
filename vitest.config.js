import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/js/__tests__/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      include: ["src/js/**/*.js"],
      exclude: ["src/js/__tests__/**", "src/js/app.js"],
    },
  },
});
