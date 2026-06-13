const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
require('@next/env').loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
let prisma;
if (databaseUrl && (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://"))) {
  const { Pool } = require("pg");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  prisma = new PrismaClient();
}

const client = new Client({ connectionString: process.env.DATABASE_URL + '&options=-c%20timezone=UTC' });

async function run() {
  await client.connect();

  const phone = '8573883898'; // Krishna Mani Tripathi
  const testPassword = 'Atul@123456';
  const hashed = await bcrypt.hash(testPassword, 12);

  console.log(`Setting password for ${phone} to "${testPassword}"...`);
  await client.query('UPDATE "User" SET password = $1 WHERE phone = $2', [hashed, phone]);

  console.log("Password updated successfully.");

  // Now, simulate the authorize callback
  console.log("\n--- SIMULATING authorize() ---");
  const credentials = {
    identifier: phone,
    password: testPassword
  };

  const isEmail = credentials.identifier.includes("@");
  const cleanPhone = isEmail ? "" : credentials.identifier.replace(/\D/g, "").slice(-10);

  let user = null;
  if (isEmail) {
    user = await prisma.user.findUnique({
      where: { email: credentials.identifier.toLowerCase().trim() },
      select: { id: true, email: true, name: true, role: true, password: true, tenant: { select: { id: true } } },
    });
  } else {
    user = await prisma.user.findFirst({
      where: { phone: { endsWith: cleanPhone } },
      select: { id: true, email: true, name: true, role: true, password: true, tenant: { select: { id: true } } },
    });
  }

  if (!user) {
    throw new Error("User not found during authorize simulation!");
  }
  console.log("Resolved User from DB:", user);

  const isValid = await bcrypt.compare(credentials.password, user.password);
  if (!isValid) {
    throw new Error("Password mismatch!");
  }
  console.log("Password is valid!");

  const authorizedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenant?.id || null,
  };
  console.log("Returned Authorized User:", authorizedUser);

  // Now, simulate the jwt callback
  console.log("\n--- SIMULATING jwt() ---");
  let token = {};
  
  // Initial sign in passes user
  if (authorizedUser) {
    token.role = authorizedUser.role;
    token.id = authorizedUser.id;
    token.tenantId = authorizedUser.tenantId ?? null;
  }

  const jwtResult = {
    role: token.role,
    id: token.id,
    tenantId: token.tenantId,
    sub: token.sub || authorizedUser.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    jti: 'test-jti',
  };
  console.log("Returned JWT Token:", jwtResult);

  // Now, simulate the session callback
  console.log("\n--- SIMULATING session() ---");
  let session = {
    user: {
      name: authorizedUser.name,
      email: authorizedUser.email,
      image: null
    }
  };

  if (session.user && jwtResult.id) {
    session.user.role = jwtResult.role;
    session.user.id = jwtResult.id;
    session.user.tenantId = jwtResult.tenantId;

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: jwtResult.id },
        select: {
          name: true,
          email: true,
          tenant: {
            select: {
              photoUrl: true,
            },
          },
        },
      });

      if (dbUser) {
        session.user.name = dbUser.name;
        session.user.email = dbUser.email;
        
        const photo = dbUser.tenant?.photoUrl;
        session.user.image = (photo && photo.startsWith("data:")) ? null : (photo || null);
      }
    } catch (error) {
      console.error("Error fetching fresh user data in session callback:", error);
    }
  }

  console.log("Returned Session:", session);
  console.log("\n✅ ALL CALLBACKS SIMULATED SUCCESSFULLY WITHOUT ERROR!");

  await client.end();
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error("❌ SIMULATION FAILED WITH ERROR:", err);
  await client.end();
  await prisma.$disconnect();
});
