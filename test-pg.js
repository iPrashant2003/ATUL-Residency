const { Client } = require('pg');
require('@next/env').loadEnvConfig(process.cwd());

const client = new Client({ connectionString: process.env.DATABASE_URL + '&options=-c%20timezone=UTC' });

client.connect()
    .then(() => client.query('SELECT * FROM "OtpCode" ORDER BY "createdAt" DESC LIMIT 3'))
    .then(res => {
        console.log("Last OtpCodes:", res.rows);
        client.end();
    })
    .catch(console.error);
