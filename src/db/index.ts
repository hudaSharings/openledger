import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

function getDatabase() {
  if (_db) {
    return _db;
  }

  // Get DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    // During build time, DATABASE_URL might not be available
    // Check if we're in a build environment (Next.js sets this)
    const isBuildTime = process.env.NEXT_PHASE === "phase-production-build" || 
                       process.env.NEXT_PHASE === "phase-development-build";
    
    if (isBuildTime) {
      // During build, we can't use the database anyway
      // Return a proxy that will throw a helpful error if accessed
      console.warn("⚠️  DATABASE_URL not set during build. This is normal. Make sure to set it in Vercel environment variables.");
      // Return a minimal object that satisfies TypeScript but throws on access
      return null as any;
    }
    
    // At runtime, DATABASE_URL is required
    throw new Error("DATABASE_URL environment variable is not set. Please set it in your Vercel environment variables.");
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
  _pool = new Pool({
    connectionString: databaseUrl,
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  });

  // Handle pool errors
  _pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err);
  });

  _db = drizzle(_pool, { schema });
  return _db;
}

// Lazy initialization - only create connection when first accessed
// This allows the build to complete even if DATABASE_URL is not set
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const database = getDatabase();
    if (!database) {
      // This should only happen during build, but provide a helpful error
      throw new Error(
        "Database connection not available. " +
        "If this occurs at runtime, ensure DATABASE_URL is set in your Vercel environment variables."
      );
    }
    return (database as any)[prop];
  },
}) as ReturnType<typeof drizzle>;

export type Database = ReturnType<typeof drizzle>;

