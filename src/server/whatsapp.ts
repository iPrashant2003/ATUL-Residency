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
    try {
        const fs = require('fs');
        const configPath = path.join(process.cwd(), 'app-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.baseUrl) {
                return config.baseUrl;
            }
        }
    } catch (e) {
        console.error('Error reading app-config.json', e);
    }
    return `http://${getLocalIp()}:3000`;
}

// Create Prisma client — PostgreSQL in production, SQLite for local dev
function createPrismaClient() {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
        const { Pool } = require('pg');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const pool = new Pool({ connectionString: databaseUrl });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({ adapter });
    }
    // Fallback: local SQLite
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
const app = express();
app.use(express.json());

// Initialize Client 1 (Bot 1)
const client1 = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot1', dataPath: path.join(os.homedir(), '.wwebjs_auth') }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
        headless: true,
        handleSIGINT: false,
        handleSIGTERM: false
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
});

// Initialize Client 2 (Bot 2)
const client2 = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot2', dataPath: path.join(os.homedir(), '.wwebjs_auth') }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
        headless: true,
        handleSIGINT: false,
        handleSIGTERM: false
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
});

let isReady1 = false;
let isReady2 = false;
let currentQr1 = null;
let currentQr2 = null;
let currentQrImage1 = null;
let currentQrImage2 = null;
let isCronStarted = false;

// ==================== Bot 1 Event Handlers ====================
client1.on('qr', async (qr) => {
    currentQr1 = qr;
    console.log('\n======================================================');
    console.log('📲 SCAN THIS QR CODE FOR BOT 1 (Admin 1)');
    console.log('======================================================\n');
    qrcodeTerminal.generate(qr, { small: true });
    try {
        currentQrImage1 = await QRCode.toDataURL(qr);
    } catch (e) {
        console.error('Failed to generate QR data URL for Bot 1:', e);
    }
});

client1.on('ready', () => {
    isReady1 = true;
    currentQr1 = null;
    currentQrImage1 = null;
    console.log('\n✅ WHATSAPP BOT 1 IS READY!');
    console.log(`Connected as: ${client1.info.pushname || 'Admin 1'} (${client1.info.wid.user})`);
    
    // Start automated reminders cron job
    startAutomatedReminders();
});

client1.on('authenticated', () => {
    console.log('✅ Bot 1 authenticated successfully.');
});

client1.on('auth_failure', msg => {
    console.error('❌ Bot 1 authentication failure', msg);
});

client1.on('disconnected', async (reason) => {
    isReady1 = false;
    currentQr1 = null;
    currentQrImage1 = null;
    console.log('❌ WhatsApp client 1 was disconnected', reason);
    
    try {
        await client1.destroy();
    } catch (e) {
        console.warn('Error during client 1 destroy:', e.message);
    }
    console.log('Restarting WhatsApp client 1...');
    try {
        await client1.initialize();
    } catch (e) {
        console.error('Failed to reinitialize client 1:', e.message);
    }
});

// ==================== Bot 2 Event Handlers ====================
client2.on('qr', async (qr) => {
    currentQr2 = qr;
    console.log('\n======================================================');
    console.log('📲 SCAN THIS QR CODE FOR BOT 2 (Admin 2)');
    console.log('======================================================\n');
    qrcodeTerminal.generate(qr, { small: true });
    try {
        currentQrImage2 = await QRCode.toDataURL(qr);
    } catch (e) {
        console.error('Failed to generate QR data URL for Bot 2:', e);
    }
});

client2.on('ready', () => {
    isReady2 = true;
    currentQr2 = null;
    currentQrImage2 = null;
    console.log('\n✅ WHATSAPP BOT 2 IS READY!');
    console.log(`Connected as: ${client2.info.pushname || 'Admin 2'} (${client2.info.wid.user})`);
    
    // Start automated reminders cron job
    startAutomatedReminders();
});

client2.on('authenticated', () => {
    console.log('✅ Bot 2 authenticated successfully.');
});

client2.on('auth_failure', msg => {
    console.error('❌ Bot 2 authentication failure', msg);
});

client2.on('disconnected', async (reason) => {
    isReady2 = false;
    currentQr2 = null;
    currentQrImage2 = null;
    console.log('❌ WhatsApp client 2 was disconnected', reason);
    
    try {
        await client2.destroy();
    } catch (e) {
        console.warn('Error during client 2 destroy:', e.message);
    }
    console.log('Restarting WhatsApp client 2...');
    try {
        await client2.initialize();
    } catch (e) {
        console.error('Failed to reinitialize client 2:', e.message);
    }
});

// ==================== Automated Reminders Cron Job ====================
function startAutomatedReminders() {
    if (isCronStarted) return;
    isCronStarted = true;

    console.log('🕒 Starting automated reminders cron job (checks every 1h)...');
    
    const checkFirstOfMonthInvoices = async () => {
        // Run reminders if at least one bot is ready
        if (!isReady1 && !isReady2) return;
        const now = new Date();
        if (now.getDate() !== 1) return;
        
        try {
            console.log('🔍 Checking for 1st-of-month pending invoices...');
            const pendingRecords = await prisma.rentRecord.findMany({
                where: { 
                    status: 'PENDING',
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                    invoiceSent: false
                },
                include: { tenant: true }
            });
            
            let sentCount = 0;
            for (const record of pendingRecords) {
                const tenant = record.tenant;
                if (!tenant.whatsapp) continue;
                
                const balance = record.totalAmount - record.amountPaid;
                const invoiceUrl = `${getBaseUrl()}/api/rent/${record.id}/invoice`;
                
                const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const msg = `🏢 ATUL RESIDENCY\n\nDear ${tenant.name},\n\nHere is your detailed rent invoice for ${months[record.month - 1]} ${record.year}.\nRent : ${record.rentAmount}     Electricity Bill: ${record.electricityBill} \nTotal Due: ₹${balance.toLocaleString('en-IN')}\nPlease Pay on time \n📄 View & Download PDF Invoice:\n${invoiceUrl}\n\nPlease pay: atultiwari123321@oksbi\n\n💡 *Tip*: If the link is not clickable, please reply with "Ok" or save this contact.\n\nThank you!`;
                
                const cleanNumber = tenant.whatsapp.replace(/\D/g, '');
                const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
                const chatId = `${formattedNumber}@c.us`;
                
                // Fallback to active bot client
                const activeClient = isReady1 ? client1 : client2;
                
                try {
                    await activeClient.sendMessage(chatId, msg);
                    await prisma.rentRecord.update({
                        where: { id: record.id },
                        data: { invoiceSent: true, lastReminderSentAt: now }
                    });
                    console.log(`✅ Sent monthly invoice to ${tenant.name} using Bot ${activeClient === client1 ? '1' : '2'}`);
                    sentCount++;
                } catch (e) {
                    console.error(`❌ Failed to send monthly invoice to ${tenant.name}`, e);
                }
                
                await new Promise(r => setTimeout(r, 2000));
            }
            if (sentCount > 0) {
                console.log(`✅ Automated monthly invoice check complete. Sent ${sentCount} invoices.`);
            }
        } catch (e) {
            console.error('Error in automated monthly invoice check:', e);
        }
    };

    const checkOverdue = async () => {
        if (!isReady1 && !isReady2) return;
        
        try {
            console.log('🔍 Checking for overdue rent records...');
            const overdueRecords = await prisma.rentRecord.findMany({
                where: { status: 'OVERDUE' },
                include: { tenant: true }
            });
            
            const now = new Date();
            let sentCount = 0;
            
            for (const record of overdueRecords) {
                // Check if last reminder was sent more than 48 hours ago
                const lastSent = record.lastReminderSentAt ? new Date(record.lastReminderSentAt) : null;
                const hoursSinceLast = lastSent ? (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60) : Infinity;
                
                if (hoursSinceLast >= 48) {
                    const tenant = record.tenant;
                    if (!tenant.whatsapp) continue;
                    
                    const balance = record.totalAmount - record.amountPaid;
                    const invoiceUrl = `${getBaseUrl()}/api/rent/${record.id}/invoice`;
                    
                    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    const msg = `🏢 ATUL RESIDENCY\n\nDear ${tenant.name},\n\nHere is your detailed rent invoice for ${months[record.month - 1]} ${record.year}.\nRent : ${record.rentAmount}     Electricity Bill: ${record.electricityBill} \nTotal Due: ₹${balance.toLocaleString('en-IN')}\nPlease Pay on time \n📄 View & Download PDF Invoice:\n${invoiceUrl}\n\nPlease pay: atultiwari123321@oksbi\n\n💡 *Tip*: If the link is not clickable, please reply with "Ok" or save this contact.\n\nThank you!`;
                    
                    const cleanNumber = tenant.whatsapp.replace(/\D/g, '');
                    const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
                    const chatId = `${formattedNumber}@c.us`;
                    
                    // Fallback to active bot client
                    const activeClient = isReady1 ? client1 : client2;
                    
                    try {
                        await activeClient.sendMessage(chatId, msg);
                        await prisma.rentRecord.update({
                            where: { id: record.id },
                            data: { lastReminderSentAt: now }
                        });
                        console.log(`✅ Sent overdue reminder to ${tenant.name} using Bot ${activeClient === client1 ? '1' : '2'}`);
                        sentCount++;
                    } catch (e) {
                        console.error(`❌ Failed to send reminder to ${tenant.name}`, e);
                    }
                    
                    // Small delay to avoid spamming WhatsApp
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
            if (sentCount > 0) {
                console.log(`✅ Automated check complete. Sent ${sentCount} reminders.`);
            }
        } catch (e) {
            console.error('Error in automated reminder check:', e);
        }
    };

    const runChecks = () => {
        checkFirstOfMonthInvoices();
        checkOverdue();
    };

    // Check immediately, then every 1 hour
    runChecks();
    setInterval(runChecks, 60 * 60 * 1000);
}

let isPolling = false;
async function pollWhatsappQueue() {
    if (isPolling) return;
    isPolling = true;

    try {
        const pendingMessages = await prisma.whatsappQueue.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' }
        });
        
        console.log(`[Queue] Polled DB. Found ${pendingMessages.length} pending messages. (isReady1: ${isReady1}, isReady2: ${isReady2})`);

        if (pendingMessages.length === 0) {
            isPolling = false;
            return;
        }

        if (!isReady1 && !isReady2) {
            isPolling = false;
            return;
        }

        const activeClient = isReady1 ? client1 : client2;
        const botName = isReady1 ? 'Bot 1' : 'Bot 2';

        for (const msg of pendingMessages) {
            console.log(`[Queue] Sending msg ${msg.id} to ${msg.number} via ${botName}...`);
            const cleanNumber = msg.number.replace(/\D/g, '');
            const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
            const chatId = `${formattedNumber}@c.us`;

            try {
                let response;
                if (msg.mediaBase64) {
                    const base64Data = msg.mediaBase64.split(',')[1] || msg.mediaBase64;
                    const media = new MessageMedia('image/png', base64Data, 'payment-qr.png');
                    response = await activeClient.sendMessage(chatId, media, { caption: msg.message });
                } else {
                    response = await activeClient.sendMessage(chatId, msg.message);
                }

                await prisma.whatsappQueue.update({
                    where: { id: msg.id },
                    data: { status: 'SENT' }
                });
                console.log(`[Queue] ✅ Msg ${msg.id} sent successfully.`);
            } catch (err) {
                console.error(`[Queue] ❌ Failed to send ${msg.id}:`, err.message);
                await prisma.whatsappQueue.update({
                    where: { id: msg.id },
                    data: { status: 'FAILED', error: err.message || 'Unknown error' }
                });
            }
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (e) {
        console.error('Error in pollWhatsappQueue:', e);
    } finally {
        isPolling = false;
    }
}

// ==================== Express Server Routes ====================

// Basic endpoint to send message
app.post('/send', async (req, res) => {
    if (!isReady1 && !isReady2) {
        return res.status(503).json({ error: 'WhatsApp bot clients are not ready yet.' });
    }

    try {
        const { number, message, mediaBase64 } = req.body;
        if (!number || !message) {
            return res.status(400).json({ error: 'Number and message are required.' });
        }

        // Format number to WhatsApp ID format (e.g., 919876543210@c.us)
        const cleanNumber = number.replace(/\D/g, '');
        // Default to India country code if length is 10
        const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
        const chatId = `${formattedNumber}@c.us`;

        // Select an active client: bot 1 takes priority if ready, else bot 2
        const activeClient = isReady1 ? client1 : client2;
        console.log(`Sending message via Bot ${activeClient === client1 ? '1' : '2'}...`);

        let response;
        if (mediaBase64) {
            const base64Data = mediaBase64.split(',')[1] || mediaBase64;
            const media = new MessageMedia('image/png', base64Data, 'payment-qr.png');
            response = await activeClient.sendMessage(chatId, media, { caption: message });
        } else {
            response = await activeClient.sendMessage(chatId, message);
        }
        return res.json({ success: true, response });
    } catch (err) {
        console.error('Failed to send message:', err);
        return res.status(500).json({ error: 'Failed to send message' });
    }
});

app.get('/status', (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    // Return standard fields for backwards compatibility and detailed status for each bot
    res.json({ 
        isReady: isReady1 || isReady2, 
        qr: currentQr1 || currentQr2,
        bot1: { 
            isReady: isReady1, 
            qr: currentQr1,
            qrImage: currentQrImage1,
            phone: isReady1 && client1.info && client1.info.wid ? client1.info.wid.user : null,
            pushname: isReady1 && client1.info ? client1.info.pushname : null
        },
        bot2: { 
            isReady: isReady2, 
            qr: currentQr2,
            qrImage: currentQrImage2,
            phone: isReady2 && client2.info && client2.info.wid ? client2.info.wid.user : null,
            pushname: isReady2 && client2.info ? client2.info.pushname : null
        }
    });
});

app.post('/logout', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const { bot } = req.body;
    if (bot !== 'bot1' && bot !== 'bot2') {
        return res.status(400).json({ error: 'Invalid bot name. Must be bot1 or bot2.' });
    }

    try {
        const targetBot = bot === 'bot1' ? client1 : client2;
        const isReady = bot === 'bot1' ? isReady1 : isReady2;
        
        console.log(`Resetting session for ${bot}...`);
        
        if (isReady) {
            try {
                await targetBot.logout();
            } catch (logoutErr) {
                console.warn(`Logout command failed for ${bot}, will force destroy:`, logoutErr.message);
                await targetBot.destroy();
            }
        } else {
            try {
                await targetBot.destroy();
            } catch (e) {
                console.warn(`Destroy failed for ${bot}:`, e.message);
            }
        }

        // Delete session files
        const fs = require('fs');
        const sessionPath = path.join(os.homedir(), '.wwebjs_auth', `session-${bot}`);
        if (fs.existsSync(sessionPath)) {
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(`Deleted session folder at ${sessionPath}`);
            } catch (rmErr) {
                console.error(`Failed to delete session folder:`, rmErr);
            }
        }

        // Reset state
        if (bot === 'bot1') {
            isReady1 = false;
            currentQr1 = null;
            currentQrImage1 = null;
        } else {
            isReady2 = false;
            currentQr2 = null;
            currentQrImage2 = null;
        }

        // Reinitialize client
        console.log(`Re-initializing WhatsApp ${bot}...`);
        await targetBot.initialize();

        return res.json({ success: true, message: `Successfully reset and reinitialized ${bot}` });
    } catch (err) {
        console.error(`Error resetting session for ${bot}:`, err);
        return res.status(500).json({ error: err.message || 'Failed to reset session' });
    }
});

app.post('/pair', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const { bot, phone } = req.body;
    if (!bot || !phone) {
        return res.status(400).json({ error: 'Bot name and phone number are required.' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
        return res.status(400).json({ error: 'Invalid phone number. Must have at least 10 digits.' });
    }
    // Format to include country code (default 91 for India if length is 10)
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    try {
        console.log(`Requesting pairing code for ${bot} with phone: ${formattedPhone}...`);
        
        if (bot === 'bot1') {
            if (isReady1) {
                return res.status(400).json({ error: 'Bot 1 is already linked and ready.' });
            }
            const code = await client1.requestPairingCode(formattedPhone);
            return res.json({ success: true, code });
        } else if (bot === 'bot2') {
            if (isReady2) {
                return res.status(400).json({ error: 'Bot 2 is already linked and ready.' });
            }
            const code = await client2.requestPairingCode(formattedPhone);
            return res.json({ success: true, code });
        } else {
            return res.status(400).json({ error: 'Invalid bot name. Must be bot1 or bot2.' });
        }
    } catch (err) {
        console.error(`Failed to request pairing code for ${bot}:`, err);
        return res.status(500).json({ error: err.message || 'Failed to request pairing code. Make sure the bot client is running and not already linked.' });
    }
});

// ==================== Automated Daily Database Backups ====================
function runDailyBackup() {
    console.log('⏰ [Daily Backup] Starting automated scheduled database backup...');
    const { exec } = require('child_process');
    exec('node scripts/backup-db.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ [Daily Backup] Automated backup failed: ${error.message}`);
            return;
        }
        if (stderr && !stderr.includes('Warning: SECURITY WARNING')) {
            console.warn(`⚠️ [Daily Backup] Backup finished with warnings: ${stderr}`);
        }
        console.log(`✅ [Daily Backup] Automated backup successfully completed.\n`);
    });
}

function startAutomatedBackups() {
    console.log('🕒 Starting automated daily database backup scheduler (checks every 1h, runs at 2 AM)...');
    let lastBackupDate = '';

    const checkAndRunBackup = () => {
        const now = new Date();
        const dateStr = now.toDateString();
        const currentHour = now.getHours();

        // Run at 2:00 AM and make sure we only run it once per day
        if (currentHour === 2 && lastBackupDate !== dateStr) {
            lastBackupDate = dateStr;
            runDailyBackup();
        }
    };

    // Run once on startup after 30 seconds, then check every hour
    setTimeout(() => {
        console.log('⏰ [Startup Backup] Running initial database backup on boot...');
        runDailyBackup();
    }, 30000);

    setInterval(checkAndRunBackup, 60 * 60 * 1000); // Check every hour
}

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`WhatsApp API Server running on port ${PORT}`);
    console.log(`Starting WhatsApp clients initialization (Dual-Bot)...`);
    client1.initialize().catch(e => console.error('Failed to initialize client 1:', e.message));
    client2.initialize().catch(e => console.error('Failed to initialize client 2:', e.message));
    
    // Start database queue polling
    console.log('🔄 Starting database queue polling for WhatsApp reminders (every 5s)...');
    pollWhatsappQueue();
    setInterval(pollWhatsappQueue, 5000);

    // Start automated database backups
    startAutomatedBackups();
});

process.on('unhandledRejection', (reason, promise) => {
    console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});
