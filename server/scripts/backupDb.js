// server/scripts/backupDb.js
//
// Creates a compressed MongoDB backup (.gz) using `mongodump`, stores it locally
// in `server/backups/`, and uploads a secondary off-site copy to Google Drive
// under `<ROOT>/System Backups/`.
//
// Usage (from `server/`):
//   npm run backup
//   node scripts/backupDb.js --local-only

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const storageService = require('../utils/storageService');

function resolveMongodumpBinary() {
  // Prefer `mongodump` from PATH; fall back to standard Windows MongoDB Tools install paths
  const probe = spawnSync('mongodump', ['--version'], { stdio: 'ignore', shell: false });
  if (!probe.error) return 'mongodump';

  const toolsRoot = 'C:\\Program Files\\MongoDB\\Tools';
  if (fs.existsSync(toolsRoot)) {
    const versions = fs.readdirSync(toolsRoot).sort().reverse();
    for (const ver of versions) {
      const candidate = path.join(toolsRoot, ver, 'bin', 'mongodump.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return 'mongodump';
}

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + '_' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('-');
}

async function runBackup() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI is not set in server/.env.');
    process.exit(1);
  }

  const localOnly = process.argv.includes('--local-only');
  const backupsDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  const fileName = `cot_backup_${formatTimestamp()}.gz`;
  const archivePath = path.join(backupsDir, fileName);

  console.log(`Starting MongoDB backup -> ${archivePath}`);
  const mongodumpBin = resolveMongodumpBinary();
  const dump = spawnSync(
    mongodumpBin,
    [`--uri=${mongoUri}`, `--archive=${archivePath}`, '--gzip'],
    { stdio: 'inherit', shell: false }
  );

  if (dump.error) {
    if (dump.error.code === 'ENOENT') {
      console.error(
        'Error: "mongodump" was not found in PATH. Install MongoDB Database Tools and retry.'
      );
    } else {
      console.error('Error running mongodump:', dump.error.message);
    }
    process.exit(1);
  }

  if (dump.status !== 0) {
    console.error(`mongodump exited with status code ${dump.status}.`);
    process.exit(dump.status || 1);
  }

  const stats = fs.statSync(archivePath);
  console.log(`Local backup saved (${(stats.size / 1024).toFixed(1)} KB): ${archivePath}`);

  if (localOnly) {
    console.log('Skipping Google Drive upload (--local-only specified).');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    const buffer = fs.readFileSync(archivePath);
    const uploaded = await storageService.uploadFile({
      folderPath: ['System Backups'],
      buffer,
      fileName,
      mimeType: 'application/gzip',
    });
    console.log(
      `Google Drive backup uploaded to "System Backups/${uploaded.name}" (fileId: ${uploaded.fileId})`
    );
  } catch (err) {
    console.warn('Warning: Local backup succeeded, but Google Drive upload failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runBackup();
