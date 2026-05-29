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
    } catch (err) {
        console.error('❌ Backup failed:', err);
    } finally {
        await client.end();
    }
}

runBackup();
