import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });
dotenv.config(); // Also try .env

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL is not set!");
  console.error("Please create a .env.local file with your Neon database URL.");
  console.error("See CREATE_ENV.md for instructions.");
  process.exit(1);
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;

