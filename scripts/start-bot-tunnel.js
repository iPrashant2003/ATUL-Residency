const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Load environment variables from .env.local
require('@next/env').loadEnvConfig(process.cwd());

// Create Prisma client
const databaseUrl = process.env.DATABASE_URL;
let prisma;
if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    prisma = new PrismaClient({ adapter });
}

console.log('🌐 Starting localtunnel to expose port 3001...');
const lt = spawn('npx', ['localtunnel', '--port', '3001'], { shell: true });

let tunnelUrl = '';
let botStarted = false;
let botProcess = null;

lt.stdout.on('data', async (data) => {
    const output = data.toString();
    console.log(`[Tunnel] ${output.trim()}`);
    
    // Scan output for localtunnel URL (e.g. your url is: https://silver-aliens-search.loca.lt)
    const match = output.match(/your url is:\s+(https:\/\/\S+)/i);
    if (match && !botStarted) {
        tunnelUrl = match[1];
        console.log(`\n🎉 Public Tunnel URL Established: ${tunnelUrl}`);
        
        try {
            console.log('📝 Registering tunnel URL in the database...');
            await prisma.activityLog.create({
                data: {
                    action: 'WHATSAPP_BOT_URL',
                    entity: 'SYSTEM',
                    details: tunnelUrl
                }
            });
            console.log('✅ Registered successfully. Production Vercel site now routes requests here.');
        } catch (err) {
            console.error('❌ Failed to register bot URL in database:', err.message);
        }
        
        // Launch the WhatsApp bot with the tunnel URL in environment
        console.log('🚀 Launching WhatsApp bot...');
        const botEnv = { ...process.env, TUNNEL_URL: tunnelUrl };
        botProcess = spawn('npx', ['tsx', 'src/server/whatsapp.ts'], {
            env: botEnv,
            stdio: 'inherit',
            shell: true
        });
        
        botStarted = true;
        
        botProcess.on('close', (code) => {
            console.log(`\n❌ WhatsApp bot process exited with code ${code}`);
            cleanup();
            process.exit(code);
        });
    }
});

lt.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Tunnel Error] ${msg}`);
});

lt.on('close', (code) => {
    console.log(`\n❌ Localtunnel process exited with code ${code}`);
    cleanup();
    process.exit(code);
});

function cleanup() {
    if (lt) lt.kill();
    if (botProcess) botProcess.kill();
}

// Handle exit signals
process.on('SIGINT', () => {
    console.log('\nStopping Localtunnel and WhatsApp bot...');
    cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nStopping Localtunnel and WhatsApp bot...');
    cleanup();
    process.exit(0);
});
