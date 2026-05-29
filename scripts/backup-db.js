const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('@next/env').loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is not defined.');
    process.exit(1);
}

// Append timezone=UTC option to ensure date consistency
const connectionString = databaseUrl.includes('?') 
    ? `${databaseUrl}&options=-c%20timezone=UTC` 
    : `${databaseUrl}?options=-c%20timezone=UTC`;

const client = new Client({ connectionString });

const TABLES = [
    'User',
    'Tower',
    'Room',
    'Tenant',
    'RentRecord',
    'Payment',
    'MaintenanceRequest',
    'Notification',
    'Document',
    'ActivityLog',
    'OtpCode',
    'WhatsappQueue'
];

async function runBackup() {
    console.log('🔄 Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully.');

    const backupData = {
        timestamp: new Date().toISOString(),
        tables: {}
    };

    try {
        for (const table of TABLES) {
            console.log(`📦 Exporting table "${table}"...`);
            // Check if table exists first to avoid crashes on partial migrations
            const tableExistsRes = await client.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );`,
                [table]
            );

            if (!tableExistsRes.rows[0].exists) {
                console.log(`⚠️ Table "${table}" does not exist in the database. Skipping.`);
                continue;
            }

            const res = await client.query(`SELECT * FROM "${table}"`);
            backupData.tables[table] = res.rows;
            console.log(`✔️ Exported ${res.rows.length} rows from "${table}".`);
        }

        // Create backups directory if it doesn't exist
        const backupsDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup-${dateStr}.json`;
        const filePath = path.join(backupsDir, fileName);

        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

        console.log('\n==================================================');
        console.log('🎉 DATABASE BACKUP COMPLETED SUCCESSFULLY!');
        console.log(`📂 Saved to: ${filePath}`);
        console.log('==================================================\n');

        // Email the backup file to admin for off-site cloud sync
        await emailBackup(filePath, fileName);
    } catch (err) {
        console.error('❌ Backup failed:', err);
    } finally {
        await client.end();
    }
}

async function emailBackup(filePath, fileName) {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const adminEmail = process.env.ADMIN_EMAIL || 'atultiwari123321@gmail.com';

    if (!smtpUser || !smtpPass) {
        console.log('ℹ️ SMTP credentials not found in environment. Skipping email sync.');
        return;
    }

    console.log(`✉️ Syncing backup file to cloud inbox: sending to ${adminEmail}...`);
    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        await transporter.sendMail({
            from: `"Atul Residency Database Backups" <${smtpUser}>`,
            to: adminEmail,
            subject: `💾 Database Backup Sync - ${new Date().toLocaleDateString('en-IN')}`,
            text: `Hello Admin,\n\nYour automated database backup for Atul Residency has successfully completed.\n\nDetails:\n- Date: ${new Date().toLocaleString('en-IN')}\n- Backup File: ${fileName}\n\nWe have attached the backup JSON file to this email for secure cloud archiving. Keep this email safe. In the event of a database crash, you can download the attached file and restore your entire system immediately using: \n"npm run db:restore"\n\nBest Regards,\nAtul Residency Automation`,
            attachments: [
                {
                    filename: fileName,
                    path: filePath
                }
            ]
        });
        console.log(`📧 Database backup successfully emailed to ${adminEmail}!`);
    } catch (err) {
        console.error('❌ Failed to email database backup:', err.message);
    }
}

runBackup();
