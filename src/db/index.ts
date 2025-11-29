import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";

// Get DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set. Please create .env.local file with your database URL.");
}

// Configure WebSocket for Node.js environments
if (typeof window === "undefined") {
  try {
    const { WebSocket } = require("ws");
    neonConfig.webSocketConstructor = WebSocket;
    
    // Try to use bufferutil for better performance (optional)
    try {
      require("bufferutil");
    } catch {
      // bufferutil is optional, continue without it
    }
  } catch (error) {
    console.error("Failed to configure WebSocket:", error);
  }
}

// Create pool with better connection settings
const pool = new Pool({
  connectionString: databaseUrl,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

