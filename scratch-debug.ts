import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const records = await prisma.rentRecord.findMany({
    where: {
      NOT: {
        meterPhotoUrl: null
      }
    },
    select: {
      id: true,
      month: true,
      year: true,
      meterReading: true,
      meterPhotoUrl: true
    }
  });
  console.log("Rent records with meter photos:");
  console.log(records);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
