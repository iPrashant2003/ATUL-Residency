const { Client } = require('pg');
require('@next/env').loadEnvConfig(process.cwd());

const client = new Client({ connectionString: process.env.DATABASE_URL + '&options=-c%20timezone=UTC' });

async function check() {
  await client.connect();
  
  console.log("--- LATEST USERS ---");
  const usersRes = await client.query('SELECT id, name, email, role, phone, password FROM "User" ORDER BY "createdAt" DESC LIMIT 5');
  usersRes.rows.forEach(row => {
    console.log({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      phone: row.phone,
      hasPassword: !!row.password,
      passwordHash: row.password ? row.password.slice(0, 10) + '...' : null
    });
  });

  console.log("\n--- LATEST TENANTS ---");
  const tenantsRes = await client.query('SELECT id, name, email, phone, "userId", "roomId" FROM "Tenant" ORDER BY "createdAt" DESC LIMIT 5');
  tenantsRes.rows.forEach(row => {
    console.log(row);
  });

  await client.end();
}

check().catch(console.error);
