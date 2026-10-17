// Prisma does not allow choosing the datasource provider at runtime, so this script
// rewrites the `provider` line of prisma/schema.prisma based on DATABASE_URL.
// It runs before `prisma generate` on Vercel; locally it is a no-op (SQLite).
import { readFileSync, writeFileSync } from "node:fs";
import "dotenv/config";

const schemaPath = new URL("../prisma/schema.prisma", import.meta.url);
const url = process.env.DATABASE_URL ?? "";
const provider = url.startsWith("postgres") ? "postgresql" : "sqlite";

const schema = readFileSync(schemaPath, "utf8");
const updated = schema.replace(/(datasource db \{\s*provider\s*=\s*)"[a-z]+"/, `$1"${provider}"`);
writeFileSync(schemaPath, updated);
console.log(`[set-db-provider] datasource provider = ${provider}`);
