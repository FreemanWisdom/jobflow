import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Integration suites share one PostgreSQL database; run files serially so
    // their user fixtures cannot interfere across suites.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // lib modules use `import "server-only"` to enforce RSC boundaries;
      // unit tests import that logic directly, so stub the guard out.
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
});
