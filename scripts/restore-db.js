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

async function runRestore() {
    console.log('🔄 Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully.');

    try {
        console.log('⚠️ Preparing to restore data. Bypassing foreign key constraints...');
        // Disable foreign keys and triggers for the session using PostgreSQL replication role
        await client.query("SET session_replication_role = 'replica'");

        const tablesToRestore = Object.keys(backupData.tables);
        
        console.log('🧹 Clearing existing tables...');
        for (const table of tablesToRestore) {
            console.log(`  Truncating table "${table}"...`);
            await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
        }

        console.log('📥 Restoring table rows...');
        for (const table of tablesToRestore) {
            const rows = backupData.tables[table];
            if (rows.length === 0) {
                console.log(`  Table "${table}" has 0 rows. Skipping.`);
                continue;
            }

            console.log(`  Restoring ${rows.length} rows to "${table}"...`);
            
            // Get columns from the first row
            const columns = Object.keys(rows[0]);
            const columnsStr = columns.map(c => `"${c}"`).join(', ');
            
            for (const row of rows) {
                const values = columns.map(c => row[c]);
                const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
                
                const insertQuery = `INSERT INTO "${table}" (${columnsStr}) VALUES (${placeholders})`;
                await client.query(insertQuery, values);
            }
            console.log(`  ✔️ Restored "${table}" successfully.`);
        }

        console.log('🔐 Restoring foreign key constraints...');
        await client.query("SET session_replication_role = 'origin'");

        console.log('\n==================================================');
        console.log('🎉 DATABASE RESTORE COMPLETED SUCCESSFULLY!');
        console.log(`✅ Fully restored from: ${backupFilePath}`);
        console.log('==================================================\n');
    } catch (err) {
        console.error('❌ Restore failed:', err);
        console.log('🔐 Re-enabling constraints just in case...');
        try {
            await client.query("SET session_replication_role = 'origin'");
        } catch (_) {}
    } finally {
        await client.end();
    }
}

runRestore();
