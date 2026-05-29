import { defineConfig } from "prisma/config";
import path from "path";

// In production (Vercel), DATABASE_URL is a PostgreSQL connection string (e.g., from Neon/Supabase).
// In local development, if DATABASE_URL is not set, we fall back to local SQLite.
const databaseUrl = process.env.DATABASE_URL;

const isPostgres = databaseUrl && 
  (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://"));

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: isPostgres 
      ? databaseUrl! 
      : `file:${path.join(process.cwd(), "prisma", "dev.db")}`,
  },
});
