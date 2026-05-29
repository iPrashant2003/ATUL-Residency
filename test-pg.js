const { Client } = require('pg');
require('@next/env').loadEnvConfig(process.cwd());

const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect()
    .then(() => client.query('SELECT * FROM "WhatsappQueue" ORDER BY "createdAt" DESC LIMIT 1'))
    .then(res => {
        console.log("Last Record:", res.rows);
        client.end();
    })
    .catch(console.error);
