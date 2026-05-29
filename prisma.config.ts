import { defineConfig } from "prisma/config";
import path from "path";
import fs from "fs";

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // Try reading from .env or .env.local
  for (const file of [".env.local", ".env"]) {
    try {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");
        const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch (e) {
      // Ignore
    }
  }
  return undefined;
}

const databaseUrl = getDatabaseUrl();
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
