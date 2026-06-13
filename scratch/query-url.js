const { Client } = require('pg');
require('@next/env').loadEnvConfig(process.cwd());

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();
    const res = await client.query('SELECT * FROM "ActivityLog" WHERE "action" = \'WHATSAPP_BOT_URL\' ORDER BY "createdAt" DESC LIMIT 1');
    console.log('Latest registered WHATSAPP_BOT_URL log:', res.rows[0]);
    await client.end();
}

run().catch(console.error);
