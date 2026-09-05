// @ts-nocheck
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const os = require('os');
const fs = require('fs');


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ==================== Utility ====================

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

function getBaseUrl() {
    if (process.env.APP_URL) return process.env.APP_URL;
    if (process.env.NEXTAUTH_URL) {
        const url = process.env.NEXTAUTH_URL;
        if (url.includes('localhost') || url.includes('127.0.0.1')) return url;
        return url.replace(/^http:/, 'https:');
    }
    try {
        const configPath = path.join(process.cwd(), 'app-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.baseUrl) return config.baseUrl;
        }
    } catch (e) {}
    return `http://${getLocalIp()}:3000`;
}

function createPrismaClient() {
    try {
        let databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_DIRECT;
        if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
            databaseUrl = databaseUrl.replace('channel_binding=require&', '').replace('&channel_binding=require', '').replace('channel_binding=require', '');
            const { Pool } = require('pg');
            const { PrismaPg } = require('@prisma/adapter-pg');
            const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
            const adapter = new PrismaPg(pool);
            return new PrismaClient({ adapter });
        }
    } catch (e) {
        console.warn('⚠️ Adapter init failed, using standard PrismaClient:', e.message);
    }
    try {
        return new PrismaClient();
    } catch (err) {
        console.warn('⚠️ Could not initialize PrismaClient:', err.message);
        return new PrismaClient();
    }
}

function killStaleChrome() {
    try {
        const { execSync } = require('child_process');
        if (process.platform === 'win32') {
            console.log('🧹 Killing stale Chrome/Chromium processes synchronously...');
            execSync('taskkill /F /IM chrome.exe /T 2>nul & taskkill /F /IM chromium.exe /T 2>nul', { shell: 'cmd.exe', stdio: 'ignore', windowsHide: true });
        } else {
            execSync('pkill -f "chrome" 2>/dev/null || true', { stdio: 'ignore' });
        }
    } catch (e) {}
}

function cleanSessionLock() {
    const authDir = path.join(os.homedir(), '.wwebjs_auth');
    if (fs.existsSync(authDir)) {
        try {
            const dirs = fs.readdirSync(authDir);
            for (const dir of dirs) {
                const sessionDir = path.join(authDir, dir);
                if (fs.statSync(sessionDir).isDirectory()) {
                    const files = fs.readdirSync(sessionDir);
                    for (const f of files) {
                        if (f.startsWith('Singleton') || f.endsWith('.lock') || f.includes('Lock') || f === 'DevToolsActivePort') {
                            try { fs.rmSync(path.join(sessionDir, f), { force: true, recursive: true }); } catch (e) {}
                        }
                    }
                }
            }
            console.log('🧹 Cleaned all stale session lock files across all profiles');
        } catch (e) {}
    }
}

// Wipe sessions that are older than 7 days — they cause hangs after system sleep/restart
function clearStaleSession() {
    const sessionPath = path.join(os.homedir(), '.wwebjs_auth', 'session-bot_v2');
    if (!fs.existsSync(sessionPath)) return;
    try {
        const stat = fs.statSync(sessionPath);
        const ageMs = Date.now() - stat.mtimeMs;
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays > 7) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`🗑️ Cleared stale WhatsApp session (${ageDays.toFixed(1)} days old) — will re-pair fresh.`);
        }
    } catch (e) {}
}


// ==================== State ====================

const prisma = createPrismaClient();
const app = express();
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

let botClient = null;
let botReady = false;
let botQr = null;
let botQrImage = null;
let botPairingCode = null;
let botInitializing = false;
let botInitializingTimeout = null;
let isCronStarted = false;

// ==================== Bot Initialization ====================

async function initializeBot(pairingPhone = null) {
    if (botInitializing) {
        console.log('⚠️ Bot is already initializing, skipping duplicate call.');
        return;
    }
    botInitializing = true;
    console.log('🤖 Initializing WhatsApp bot...' + (pairingPhone ? ` (pairing mode: ${pairingPhone})` : ''));

    // Safety timeout: reset botInitializing if stuck after 60s
    if (botInitializingTimeout) clearTimeout(botInitializingTimeout);
    botInitializingTimeout = setTimeout(() => {
        if (botInitializing && !botReady) {
            console.warn('⚠️ Bot initialization timed out after 60s. Resetting flag...');
            botInitializing = false;
        }
    }, 60000);

    // Destroy existing client
    if (botClient) {
        try { await Promise.race([botClient.destroy(), new Promise(r => setTimeout(r, 5000))]); } catch (e) {}
        botClient = null;
    }

    // Kill any leftover chrome processes from crash/force-restart
    killStaleChrome();

    // Clean lock file
    cleanSessionLock();

    const puppeteerArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-first-run',
        '--no-zygote',
        '--disable-device-discovery-notifications',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
    ];

    const options = {
        authStrategy: new LocalAuth({ clientId: 'bot_v2', dataPath: path.join(os.homedir(), '.wwebjs_auth') }),
        puppeteer: { 
            args: puppeteerArgs, 
            headless: true, 
            handleSIGINT: false, 
            handleSIGTERM: false,
            executablePath: process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        webVersionCache: {
            type: 'none'
        },
        qrMaxRetries: 0,
    };

    if (pairingPhone) {
        options.pairWithPhoneNumber = { phoneNumber: pairingPhone, showNotification: true, intervalMs: 120000 };
    }

    botClient = new Client(options);

    botClient.on('qr', async (qr) => {
        console.log('\n======================================================');
        console.log('📲 NEW QR CODE READY — Scan with WhatsApp');
        console.log('======================================================\n');
        qrcodeTerminal.generate(qr, { small: true });
        botQr = qr;
        botPairingCode = null;
        try {
            botQrImage = await QRCode.toDataURL(qr);
            console.log('✅ QR image generated successfully');
        } catch (e) {
            console.error('❌ Failed to generate QR image:', e.message);
        }
    });

    botClient.on('code', (code) => {
        console.log(`🔑 Pairing code received: ${code}`);
        botPairingCode = code;
        botQr = null;
        botQrImage = null;
    });

    botClient.on('ready', () => {
        botReady = true;
        botQr = null;
        botQrImage = null;
        botPairingCode = null;
        botInitializing = false;
        console.log('\n✅ WHATSAPP BOT IS READY!');
        try { console.log(`Connected as: ${botClient.info.pushname} (+${botClient.info.wid.user})`); } catch (e) {}
        startAutomatedReminders();
    });

    botClient.on('authenticated', () => {
        console.log('✅ Bot authenticated successfully.');
        botInitializing = false;
    });

    botClient.on('auth_failure', async (msg) => {
        console.error('❌ Bot authentication failure:', msg);
        botReady = false;
        botQr = null;
        botQrImage = null;
        botPairingCode = null;
        botInitializing = false;
        // Wipe bad session and restart
        try {
            const sessionPath = path.join(os.homedir(), '.wwebjs_auth', 'session-bot');
            if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch (e) {}
        setTimeout(() => initializeBot(), 5000);
    });

    botClient.on('disconnected', async (reason) => {
        console.log('❌ Bot disconnected:', reason);
        botReady = false;
        botQr = null;
        botQrImage = null;
        botPairingCode = null;
        botInitializing = false;
        try { await botClient.destroy(); } catch (e) {}
        console.log('🔄 Restarting bot in 5s...');
        setTimeout(() => initializeBot(), 5000);
    });

    try {
        await botClient.initialize();
    } catch (e) {
        console.error('❌ Bot initialize() threw:', e.message);
        botInitializing = false;
        console.log('🔄 Retrying bot initialization in 10 seconds...');
        setTimeout(() => initializeBot(pairingPhone), 10000);
    }
}

// ==================== Automated Reminders ====================

function startAutomatedReminders() {
    if (isCronStarted) return;
    isCronStarted = true;
    console.log('🕒 Starting automated reminders cron (hourly)...');

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const buildMessage = (tenant, record) => {
        const balance = record.totalAmount - record.amountPaid;
        const invoiceUrl = `${getBaseUrl()}/api/rent/${record.id}/invoice`;
        let breakdown = `🏠 *Rent*: ₹${record.rentAmount}\n`;
        if (record.electricityBill > 0) breakdown += `⚡ *Electricity*: ₹${record.electricityBill}\n`;
        if (record.maintenanceCharge > 0) breakdown += `🔧 *Maintenance*: ₹${record.maintenanceCharge}\n`;
        if (record.lateFee > 0) breakdown += `⏳ *Late Fee*: ₹${record.lateFee}\n`;
        if (record.discount > 0) breakdown += `🎁 *Discount*: -₹${record.discount}\n`;
        return `🏢 *ATUL RESIDENCY* 🏢\n\n👤 Dear *${tenant.name}*,\n\nHere is your rent invoice for *${months[record.month - 1]} ${record.year}*.\n\n${breakdown}-------------------------------\n💰 *Total Due*: ₹${balance.toLocaleString('en-IN')}\n-------------------------------\n\n📄 Invoice: ${invoiceUrl}\n💳 Pay via UPI: atultiwari123321@oksbi\n\n🙏 Thank you!`;
    };

    const sendMsg = async (whatsapp, msg) => {
        if (!botReady || !botClient) return false;
        try {
            const clean = whatsapp.replace(/\D/g, '');
            const num = clean.length === 10 ? `91${clean}` : clean;
            await botClient.sendMessage(`${num}@c.us`, msg);
            return true;
        } catch (e) {
            console.error('Send failed:', e.message);
            return false;
        }
    };

    const runChecks = async () => {
        if (!botReady) return;
        const now = new Date();

        // Monthly invoices on 1st
        if (now.getDate() === 1) {
            try {
                const pending = await prisma.rentRecord.findMany({
                    where: { status: 'PENDING', month: now.getMonth() + 1, year: now.getFullYear(), invoiceSent: false },
                    include: { tenant: true }
                });
                for (const rec of pending) {
                    if (!rec.tenant.whatsapp) continue;
                    const sent = await sendMsg(rec.tenant.whatsapp, buildMessage(rec.tenant, rec));
                    if (sent) {
                        await prisma.rentRecord.update({ where: { id: rec.id }, data: { invoiceSent: true, lastReminderSentAt: now } });
                    }
                    await new Promise(r => setTimeout(r, 2000));
                }
            } catch (e) { console.error('Monthly invoice check failed:', e.message); }
        }

        // Overdue reminders (48h gap)
        try {
            const overdue = await prisma.rentRecord.findMany({ where: { status: 'OVERDUE' }, include: { tenant: true } });
            for (const rec of overdue) {
                if (!rec.tenant.whatsapp) continue;
                const lastSent = rec.lastReminderSentAt ? new Date(rec.lastReminderSentAt) : null;
                const hoursSince = lastSent ? (now.getTime() - lastSent.getTime()) / 3600000 : Infinity;
                if (hoursSince >= 48) {
                    const sent = await sendMsg(rec.tenant.whatsapp, buildMessage(rec.tenant, rec));
                    if (sent) await prisma.rentRecord.update({ where: { id: rec.id }, data: { lastReminderSentAt: now } });
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        } catch (e) { console.error('Overdue reminder check failed:', e.message); }
    };

    runChecks();
    setInterval(runChecks, 60 * 60 * 1000);
}

// ==================== Queue Polling ====================

let isPolling = false;
async function pollWhatsappQueue() {
    if (isPolling || !botReady || !botClient) return;
    isPolling = true;
    try {
        const pending = await prisma.whatsappQueue.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
        const now = Date.now();
        for (const msg of pending) {
            // Rate-limit retries to 30s cooldown
            if (msg.error?.includes('[Attempts:')) {
                const age = now - new Date(msg.updatedAt).getTime();
                if (age < 30000) continue;
            }
            const clean = msg.number.replace(/\D/g, '');
            const num = clean.length === 10 ? `91${clean}` : clean;
            try {
                if (msg.mediaBase64) {
                    const b64 = msg.mediaBase64.split(',')[1] || msg.mediaBase64;
                    await botClient.sendMessage(`${num}@c.us`, new MessageMedia('image/png', b64, 'payment-qr.png'), { caption: msg.message });
                } else {
                    await botClient.sendMessage(`${num}@c.us`, msg.message);
                }
                await prisma.whatsappQueue.update({ where: { id: msg.id }, data: { status: 'SENT', error: null } });
                console.log(`[Queue] ✅ Sent ${msg.id}`);
            } catch (e) {
                let attempts = 1;
                const m = msg.error?.match(/\[Attempts:\s*(\d+)\]/);
                if (m) attempts = parseInt(m[1]) + 1;
                const status = attempts < 3 ? 'PENDING' : 'FAILED';
                await prisma.whatsappQueue.update({ where: { id: msg.id }, data: { status, error: `[Attempts: ${attempts}] ${e.message}` } });
                if (e.message?.includes('detached') || e.message?.includes('Session closed') || e.message?.includes('Protocol error')) {
                    botReady = false;
                    setTimeout(() => initializeBot(), 3000);
                    break;
                }
            }
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (e) { console.error('Queue poll error:', e.message); }
    finally { isPolling = false; }
}

// ==================== Express Routes ====================

// Health check
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Status — used by the settings page to show QR / connected state
app.get('/status', (req, res) => {
    res.json({
        isReady: botReady,
        initialized: !!botClient,
        qrImage: botQrImage || null,
        pairingCode: botPairingCode || null,
        phone: botReady && botClient?.info?.wid ? botClient.info.wid.user : null,
        pushname: botReady && botClient?.info ? botClient.info.pushname : null,
        // Keep bot1 wrapper for backward compat with any existing callers
        bot1: {
            isReady: botReady,
            initialized: !!botClient,
            qrImage: botQrImage || null,
            pairingCode: botPairingCode || null,
            phone: botReady && botClient?.info?.wid ? botClient.info.wid.user : null,
            pushname: botReady && botClient?.info ? botClient.info.pushname : null,
        }
    });
});

// Send a message directly
app.post('/send', async (req, res) => {
    if (!botReady || !botClient) return res.status(503).json({ error: 'WhatsApp bot is not connected yet.' });
    const { number, message, mediaBase64 } = req.body;
    if (!number || !message) return res.status(400).json({ error: 'number and message are required.' });
    const clean = number.replace(/\D/g, '');
    const num = clean.length === 10 ? `91${clean}` : clean;
    try {
        if (mediaBase64) {
            const b64 = mediaBase64.split(',')[1] || mediaBase64;
            await botClient.sendMessage(`${num}@c.us`, new MessageMedia('image/png', b64, 'payment-qr.png'), { caption: message });
        } else {
            await botClient.sendMessage(`${num}@c.us`, message);
        }
        return res.json({ success: true });
    } catch (e) {
        console.error('Send error:', e.message);
        return res.status(500).json({ error: e.message });
    }
});

// Reset — wipe session, kill chrome, reinit fresh
app.post('/logout', async (req, res) => {
    console.log('🔄 Hard reset requested...');
    botReady = false;
    botQr = null;
    botQrImage = null;
    botPairingCode = null;

    // Destroy existing client with timeout
    const oldClient = botClient;
    botClient = null;
    if (oldClient) {
        try { await Promise.race([oldClient.logout(), new Promise(r => setTimeout(r, 3000))]); } catch (e) {}
        try { await Promise.race([oldClient.destroy(), new Promise(r => setTimeout(r, 3000))]); } catch (e) {}
    }

    // Kill leftover chrome
    try {
        const { execSync } = require('child_process');
        if (process.platform === 'win32') {
            execSync('taskkill /F /IM chrome.exe /T 2>nul & taskkill /F /IM chromium.exe /T 2>nul & exit 0', { shell: 'cmd.exe', stdio: 'ignore', windowsHide: true });
        } else {
            execSync('pkill -f "chrome" 2>/dev/null || true');
        }
    } catch (e) {}

    await new Promise(r => setTimeout(r, 2000));

    // Wipe session files
    const sessionPath = path.join(os.homedir(), '.wwebjs_auth', 'session-bot');
    if (fs.existsSync(sessionPath)) {
        try { fs.rmSync(sessionPath, { recursive: true, force: true }); console.log('🗑️ Session wiped'); } catch (e) {}
    }
    const cachePath = path.join(process.cwd(), '.wwebjs_cache');
    if (fs.existsSync(cachePath)) {
        try { fs.rmSync(cachePath, { recursive: true, force: true }); } catch (e) {}
    }
    cleanSessionLock();

    await new Promise(r => setTimeout(r, 1000));

    // Restart
    console.log('🚀 Reinitializing bot...');
    initializeBot().catch(e => console.error('Reinit failed:', e.message));

    return res.json({ success: true, message: 'Bot reset. Fresh QR will appear in 15-30 seconds.' });
});

// Pairing code — works on existing browser page (no restart needed)
app.post('/pair', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required.' });

    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) return res.status(400).json({ error: 'Invalid phone number — need at least 10 digits.' });
    const formatted = clean.length === 10 ? `91${clean}` : clean;

    if (botReady) return res.status(400).json({ error: 'Bot is already connected. Disconnect first to re-link.' });

    console.log(`[Pair] Requesting code for +${formatted}`);

    // Strategy 1: Use existing browser page (best — no restart, no rate limit)
    if (botClient?.pupPage) {
        try {
            console.log('[Pair] Browser page exists — calling requestPairingCode directly...');
            const code = await botClient.requestPairingCode(formatted, true, 120000);
            if (code) {
                botPairingCode = code;
                console.log(`[Pair] ✅ Code: ${code}`);
                return res.json({ success: true, code });
            }
        } catch (e) {
            console.warn('[Pair] Direct call failed:', e.message, '— falling back to reinit');
        }
    }

    // Strategy 2: No browser yet — reinit in pairing mode
    console.log('[Pair] No browser page — reinitializing in pairing mode...');
    botPairingCode = null;
    initializeBot(formatted).catch(e => console.error('[Pair] Init failed:', e.message));

    // Wait up to 45s for the code event
    try {
        const code = await new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('Timed out — WhatsApp did not return a code. Wait 30s and try again.')), 45000);
            const i = setInterval(() => {
                if (botPairingCode) { clearTimeout(t); clearInterval(i); resolve(botPairingCode); }
            }, 500);
        });
        console.log(`[Pair] ✅ Code via reinit: ${code}`);
        return res.json({ success: true, code });
    } catch (e) {
        console.error('[Pair] ❌', e.message);
        return res.status(500).json({ error: e.message });
    }
});

// ==================== Automated Daily Backups ====================

function startAutomatedBackups() {
    let lastBackupDate = '';
    const check = () => {
        const now = new Date();
        if (now.getHours() === 2 && lastBackupDate !== now.toDateString()) {
            lastBackupDate = now.toDateString();
            const { exec } = require('child_process');
            exec('node scripts/backup-db.js', { windowsHide: true }, (err, out, stderr) => {
                if (err) console.error('Daily backup failed:', err.message);
                else console.log('✅ Daily backup done');
            });
        }
    };
    setTimeout(() => { const { exec } = require('child_process'); exec('node scripts/backup-db.js', { windowsHide: true }, (e) => { if (!e) console.log('✅ Startup backup done'); }); }, 30000);
    setInterval(check, 60 * 60 * 1000);
}

// ==================== Start Server ====================

const PORT = 3001;
let activeTunnelProcess = null;
let heartbeatInterval = null;

let lastRegisteredCloudUrl = null;

// Helper: Registers the tunnel URL directly to Vercel cloud API endpoint and Neon DB via Prisma
async function registerUrlToCloud(url) {
    if (!url || !url.startsWith('http')) return;
    if (url === lastRegisteredCloudUrl) return; // Deduplicate: only run if URL actually changes!
    lastRegisteredCloudUrl = url;

    // Keep exactly ONE active record in database
    try {
        await prisma.activityLog.deleteMany({
            where: { action: 'WHATSAPP_BOT_URL' }
        });
        await prisma.activityLog.create({
            data: {
                action: 'WHATSAPP_BOT_URL',
                entity: 'SYSTEM',
                details: url
            }
        });
        console.log(`✅ Synced WHATSAPP_BOT_URL in database: ${url}`);
    } catch (e) {
        console.warn('⚠️ Could not sync bot URL to DB:', e.message);
    }

    const baseDomains = [
        process.env.WEB_APP_URL,
        'https://atul-residency.vercel.app',
        'http://localhost:3000'
    ].filter(Boolean);

    for (const domain of baseDomains) {
        const cleanDomain = domain.replace(/\/$/, '');
        const getEndpoint = `${cleanDomain}/api/public/register-bot?url=${encodeURIComponent(url)}`;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(getEndpoint, { signal: controller.signal }).finally(() => clearTimeout(timer));
            if (res.ok) {
                console.log(`📡 Registered bot URL to cloud (${getEndpoint}) successfully!`);
                break;
            }
        } catch (err) {}
    }
}


function killTunnelProcess(proc) {
    try {
        if (process.platform === 'win32') {
            const { execSync } = require('child_process');
            execSync('taskkill /F /IM ssh.exe /T 2>nul', { shell: 'cmd.exe', stdio: 'ignore', windowsHide: true });
        } else if (proc) {
            proc.kill('SIGKILL');
        }
    } catch (e) {}
}

async function establishTunnel(useFallback = false) {
    const providerHost = useFallback ? 'nokey@localhost.run' : 'serveo.net';
    console.log(`🌐 Establishing secure SSH tunnel via ${providerHost}...`);
    try {
        if (activeTunnelProcess) {
            killTunnelProcess(activeTunnelProcess);
            activeTunnelProcess = null;
        }
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }

        const { spawn } = require('child_process');
        const sshArgs = useFallback ? [
            '-T',
            '-N',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'ServerAliveInterval=10',
            '-o', 'ServerAliveCountMax=2',
            '-o', 'ExitOnForwardFailure=yes',
            '-R', `80:localhost:${PORT}`,
            'nokey@localhost.run'
        ] : [
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'ServerAliveInterval=10',
            '-o', 'ServerAliveCountMax=2',
            '-R', `80:localhost:${PORT}`,
            'serveo.net'
        ];

        activeTunnelProcess = spawn('ssh', sshArgs, {
            windowsHide: true
        });

        let urlFound = false;
        let currentTunnelUrl = '';

        const handleOutput = async (data) => {
            const output = data.toString();
            console.log(`[Tunnel Raw]: ${output.trim()}`);

            // Strictly match real tunnel domain extensions (.serveousercontent.com, .lhr.life, .lhrtunnel.link, etc.)
            const match = output.match(/https:\/\/[a-zA-Z0-9.-]+\.(serveousercontent\.com|lhr\.life|lhrtunnel\.link|pinggy\.link|localtunnel\.me)/);
            if (match && !urlFound) {
                urlFound = true;
                currentTunnelUrl = match[0].replace(/\/$/, '');
                console.log(`🎉 Public SSH Tunnel URL Established: ${currentTunnelUrl}`);

                // Save to local fallback file (using __dirname for reliable path resolution)
                try {
                    const projectRoot = path.resolve(__dirname, '..', '..');
                    const logDir = path.join(projectRoot, 'logs');
                    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
                    const urlFilePath = path.join(logDir, 'bot-tunnel-url.txt');
                    fs.writeFileSync(urlFilePath, currentTunnelUrl);
                    console.log(`✅ Saved tunnel URL to ${urlFilePath}`);
                } catch (fErr) {
                    console.error('⚠️ Could not write bot-tunnel-url.txt:', fErr.message);
                }

                // Register URL to cloud (Vercel) via HTTPS webhook
                registerUrlToCloud(currentTunnelUrl);



                // Start 20-second active health check
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                let failCount = 0;
                heartbeatInterval = setInterval(async () => {
                    // Periodically refresh registration on Vercel
                    registerUrlToCloud(currentTunnelUrl);

                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 6000);
                        const pingRes = await fetch(`${currentTunnelUrl}/status`, {
                            headers: { 'bypass-tunnel-reminder': 'true' },
                            signal: controller.signal
                        }).finally(() => clearTimeout(timeoutId));

                        if (pingRes.ok) {
                            failCount = 0;
                            console.log(`💓 Tunnel health OK (${currentTunnelUrl})`);
                        } else {
                            failCount++;
                            console.warn(`⚠️ Tunnel returned HTTP ${pingRes.status} (fail count: ${failCount})`);
                        }
                    } catch (pingErr) {
                        failCount++;
                        console.warn(`⚠️ Tunnel ping failed: ${pingErr.message} (fail count: ${failCount})`);
                    }

                    if (failCount >= 2) {
                        console.error('❌ Tunnel health check failed 2 times. Force-restarting SSH tunnel...');
                        clearInterval(heartbeatInterval);
                        heartbeatInterval = null;
                        if (activeTunnelProcess) {
                            killTunnelProcess(activeTunnelProcess);
                            activeTunnelProcess = null;
                        }
                        setTimeout(establishTunnel, 2000);
                    }
                }, 20000);
            }
        };

        activeTunnelProcess.stdout.on('data', handleOutput);
        activeTunnelProcess.stderr.on('data', (data) => {
            const errOutput = data.toString();
            handleOutput(data);
            if (errOutput.includes('Warning') || errOutput.includes('Pseudo-terminal')) {
                console.log(`[Tunnel SSH]: ${errOutput.trim()}`);
            }
        });

        activeTunnelProcess.on('close', (code) => {
            console.log(`❌ SSH tunnel process exited with code ${code}. Reconnecting in 3 seconds...`);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            heartbeatInterval = null;
            activeTunnelProcess = null;
            setTimeout(establishTunnel, 3000);
        });

        activeTunnelProcess.on('error', (err) => {
            console.error('❌ SSH tunnel spawn error:', err.message);
            activeTunnelProcess = null;
            setTimeout(establishTunnel, 10000);
        });

    } catch (err) {
        console.error('❌ Failed to setup SSH tunnel:', err.message);
        setTimeout(establishTunnel, 10000);
    }
}

app.listen(PORT, () => {
    console.log(`\n🟢 WhatsApp Bot Server running on port ${PORT}`);
    
    // Kill stale chrome on boot to prevent locks
    killStaleChrome();

    // Clear sessions older than 7 days (stale after sleep/restart)
    clearStaleSession();

    console.log('📱 Starting bot initialization...\n');
    initializeBot().catch(e => console.error('Initial bot start failed:', e.message));

    console.log('🔄 Starting queue polling (every 5s)...');
    pollWhatsappQueue();
    setInterval(pollWhatsappQueue, 5000);

    startAutomatedBackups();
    establishTunnel();
});

process.on('unhandledRejection', (reason) => { console.warn('Unhandled rejection:', reason); });
process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); });
