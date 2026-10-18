import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    // Tests that need a database use a dedicated SQLite file, created by the global setup.
    env: { DATABASE_URL: "file:./test.db" },
    globalSetup: ["./test/global-setup.ts"],
    // Database tests share one file: run test files one after another.
    fileParallelism: false,
  },
});
