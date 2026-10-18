import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/**
 * Runs once before the test suite: creates a fresh SQLite database for the tests
 * (test.db), so they never touch the development database.
 */
export default function setup() {
  rmSync("test.db", { force: true });
  execSync("npx prisma db push", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "ignore",
  });
}
