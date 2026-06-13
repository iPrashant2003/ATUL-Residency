const { Client } = require('pg');
require('@next/env').loadEnvConfig(process.cwd());

const client = new Client({ connectionString: process.env.DATABASE_URL + '&options=-c%20timezone=UTC' });

async function run() {
  await client.connect();
  const res = await client.query('SELECT name, "photoUrl" FROM "Tenant" WHERE name = \'Krishna Mani Tripathi\'');
  if (res.rows.length === 0) {
    console.log("Tenant not found!");
  } else {
    const row = res.rows[0];
    console.log("Name:", row.name);
    console.log("photoUrl type:", typeof row.photoUrl);
    console.log("photoUrl length:", row.photoUrl ? row.photoUrl.length : null);
    console.log("photoUrl preview:", row.photoUrl ? row.photoUrl.slice(0, 100) : null);
  }
  await client.end();
}

run().catch(console.error);
