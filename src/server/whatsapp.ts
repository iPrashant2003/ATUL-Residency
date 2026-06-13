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
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
        const { Pool } = require('pg');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const pool = new Pool({ connectionString: databaseUrl });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({ adapter });
    }
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    return new PrismaClient({ adapter });
}

function cleanSessionLock() {
    const lockPath = path.join(os.homedir(), '.wwebjs_auth', 'session-bot', 'SingletonLock');
    if (fs.existsSync(lockPath)) {
        try { fs.unlinkSync(lockPath); console.log('🧹 Cleaned stale SingletonLock'); } catch (e) {}
    }
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
let isCronStarted = false;

// ==================== Bot Initialization ====================

async function initializeBot(pairingPhone = null) {
    if (botInitializing) {
        console.log('⚠️ Bot is already initializing, skipping duplicate call.');
        return;
    }
    botInitializing = true;
    console.log('🤖 Initializing WhatsApp bot...' + (pairingPhone ? ` (pairing mode: ${pairingPhone})` : ''));

    // Destroy existing client
    if (botClient) {
        try { await Promise.race([botClient.destroy(), new Promise(r => setTimeout(r, 5000))]); } catch (e) {}
        botClient = null;
    }

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
        authStrategy: new LocalAuth({ clientId: 'bot', dataPath: path.join(os.homedir(), '.wwebjs_auth') }),
        puppeteer: { args: puppeteerArgs, headless: true, handleSIGINT: false, handleSIGTERM: false },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        webVersionCache: { type: 'none' },
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
            execSync('taskkill /F /IM chrome.exe /T 2>nul & taskkill /F /IM chromium.exe /T 2>nul & exit 0', { shell: 'cmd.exe', stdio: 'ignore' });
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
            exec('node scripts/backup-db.js', (err, out, stderr) => {
                if (err) console.error('Daily backup failed:', err.message);
                else console.log('✅ Daily backup done');
            });
        }
    };
    setTimeout(() => { const { exec } = require('child_process'); exec('node scripts/backup-db.js', (e) => { if (!e) console.log('✅ Startup backup done'); }); }, 30000);
    setInterval(check, 60 * 60 * 1000);
}

// ==================== Start Server ====================

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n🟢 WhatsApp Bot Server running on port ${PORT}`);
    console.log('📱 Starting bot initialization...\n');
    initializeBot().catch(e => console.error('Initial bot start failed:', e.message));

    console.log('🔄 Starting queue polling (every 5s)...');
    pollWhatsappQueue();
    setInterval(pollWhatsappQueue, 5000);

    startAutomatedBackups();

    // Register tunnel URL in DB
    const tunnelUrl = process.env.TUNNEL_URL || process.env.WHATSAPP_BOT_URL;
    if (tunnelUrl && !tunnelUrl.includes('localhost')) {
        prisma.activityLog.create({ data: { action: 'WHATSAPP_BOT_URL', entity: 'SYSTEM', details: tunnelUrl } })
            .then(() => console.log(`✅ Registered tunnel URL: ${tunnelUrl}`))
            .catch(e => console.error('Failed to register URL:', e.message));
    }
});

process.on('unhandledRejection', (reason) => { console.warn('Unhandled rejection:', reason); });
process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); });
