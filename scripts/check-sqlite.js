const path = require('path');
const Database = require('better-sqlite3');

async function run() {
  try {
    const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
    console.log("Connecting to SQLite at:", dbPath);
    const db = new Database(dbPath);
    
    const tables = ['User', 'Tower', 'Room', 'Tenant', 'RentRecord', 'Payment', 'MaintenanceRequest'];
    console.log("SQLITE DATABASE STATUS REPORT:");
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT count(*) as count FROM "${table}"`).get().count;
        console.log(`- ${table}: ${count}`);
      } catch (e) {
        console.log(`- ${table}: Error (${e.message})`);
      }
    }
    db.close();
  } catch (err) {
    console.error("❌ SQLite connection failed:", err.message);
  }
}

run();
