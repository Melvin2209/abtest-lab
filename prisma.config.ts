import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Falls back to the local SQLite file so a fresh clone works without a .env file.
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
