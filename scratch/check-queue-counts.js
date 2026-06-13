const { Client } = require('pg');
require('@next/env').loadEnvConfig(process.cwd());

const client = new Client({ connectionString: process.env.DATABASE_URL + '&options=-c%20timezone=UTC' });

async function run() {
  await client.connect();
  const res = await client.query('SELECT status, COUNT(*) FROM "WhatsappQueue" GROUP BY status');
  console.log("--- QUEUE STATUS COUNTS ---");
  res.rows.forEach(row => {
    console.log(`${row.status}: ${row.count}`);
  });

  const latestPending = await client.query('SELECT id, number, message, error, "createdAt" FROM "WhatsappQueue" WHERE status = \'PENDING\' ORDER BY "createdAt" DESC LIMIT 5');
  if (latestPending.rows.length > 0) {
    console.log("\n--- LATEST PENDING MESSAGES ---");
    latestPending.rows.forEach(row => {
      console.log({
        id: row.id,
        number: row.number,
        message: row.message.slice(0, 100),
        error: row.error,
        createdAt: row.createdAt
      });
    });
  }

  await client.end();
}

run().catch(console.error);
