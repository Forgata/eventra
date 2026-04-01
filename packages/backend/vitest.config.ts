import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@eventra/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    env: {
      JWT_SECRET: "test-secret-that-is-long-enough-for-hs256-algorithm",
      JWT_REFRESH_SECRET: "test-refresh-secret-long-enough-for-hs256",
    },
  },
});
