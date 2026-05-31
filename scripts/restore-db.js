const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('@next/env').loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is not defined.');
    process.exit(1);
}

// Find the latest backup file or use the provided argument
const backupsDir = path.join(process.cwd(), 'backups');
let backupFilePath = process.argv[2];

if (!backupFilePath) {
    if (!fs.existsSync(backupsDir)) {
        console.error('❌ Error: No backups directory found. Please run the backup script first.');
        process.exit(1);
    }

    const files = fs.readdirSync(backupsDir)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
        console.error('❌ Error: No backup files found in backups/ directory.');
        process.exit(1);
    }

    backupFilePath = path.join(backupsDir, files[0].name);
} else {
    backupFilePath = path.resolve(backupFilePath);
}

if (!fs.existsSync(backupFilePath)) {
    console.error(`❌ Error: Backup file not found at ${backupFilePath}`);
    process.exit(1);
}

console.log(`📂 Using backup file: ${backupFilePath}`);
const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

// Append timezone=UTC option to ensure date consistency
const connectionString = databaseUrl.includes('?') 
    ? `${databaseUrl}&options=-c%20timezone=UTC` 
    : `${databaseUrl}?options=-c%20timezone=UTC`;

const client = new Client({ connectionString });

// Tables must be deleted in reverse dependency order (children first)
// and restored in dependency order (parents first)
const DELETE_ORDER = [
    'PushSubscription',
    'WhatsappQueue',
    'OtpCode',
    'ActivityLog',
    'Document',
    'Notification',
    'MaintenanceRequest',
    'Payment',
    'RentRecord',
    'Tenant',
    'Room',
    'Tower',
    'User'
];

const RESTORE_ORDER = [
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
    'WhatsappQueue',
    'PushSubscription'
];

async function runRestore() {
    console.log('🔄 Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully.');

    try {
        // Step 1: Delete all data in reverse dependency order
        console.log('\n🧹 Clearing existing tables (reverse dependency order)...');
        for (const table of DELETE_ORDER) {
            if (!backupData.tables[table] && backupData.tables[table] === undefined) {
                continue; // Skip tables not in backup
            }
            try {
                const res = await client.query(`DELETE FROM "${table}"`);
                console.log(`  ✔️ Cleared "${table}" (${res.rowCount} rows removed)`);
            } catch (err) {
                if (err.code === '42P01') {
                    console.log(`  ⚠️ Table "${table}" does not exist. Skipping.`);
                } else {
                    console.error(`  ❌ Error clearing "${table}":`, err.message);
                }
            }
        }

        // Step 2: Insert data in dependency order
        console.log('\n📥 Restoring table rows (dependency order)...');
        let totalRestored = 0;

        for (const table of RESTORE_ORDER) {
            const rows = backupData.tables[table];
            if (!rows || rows.length === 0) {
                console.log(`  ⏭️ Table "${table}" has 0 rows. Skipping.`);
                continue;
            }

            console.log(`  📦 Restoring ${rows.length} rows to "${table}"...`);
            let restored = 0;
            let skipped = 0;

            // Get columns from the first row
            const columns = Object.keys(rows[0]);
            const columnsStr = columns.map(c => `"${c}"`).join(', ');

            for (const row of rows) {
                const values = columns.map(c => row[c]);
                const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

                try {
                    const insertQuery = `INSERT INTO "${table}" (${columnsStr}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                    const res = await client.query(insertQuery, values);
                    if (res.rowCount > 0) {
                        restored++;
                    } else {
                        skipped++;
                    }
                } catch (err) {
                    console.error(`    ❌ Failed to insert row in "${table}":`, err.message);
                    skipped++;
                }
            }

            console.log(`  ✔️ "${table}": ${restored} restored, ${skipped} skipped`);
            totalRestored += restored;
        }

        console.log('\n==================================================');
        console.log('🎉 DATABASE RESTORE COMPLETED SUCCESSFULLY!');
        console.log(`✅ Total rows restored: ${totalRestored}`);
        console.log(`📂 Restored from: ${backupFilePath}`);
        console.log('==================================================\n');
    } catch (err) {
        console.error('❌ Restore failed:', err);
    } finally {
        await client.end();
    }
}

runRestore();
