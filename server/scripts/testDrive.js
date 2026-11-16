// server/scripts/testDrive.js
//
// Run:  node scripts/testDrive.js
// Real round trip against Google Drive using a NON-SENSITIVE test file:
//   connection check -> upload -> read back -> compare -> delete -> confirm gone

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const storage = require('../utils/storageService');

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function main() {
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
  };

  const conn = await storage.checkConnection();
  check('Connected, root folder reachable', true, conn.rootFolderName);

  const original = Buffer.from(`COT e-portfolio Drive test ${new Date().toISOString()}`);
  const uploaded = await storage.uploadFile({
    instructorId: 'test-instructor',
    buffer: original,
    fileName: `drive-test-${Date.now()}.txt`,
    mimeType: 'text/plain',
  });
  check('Upload returned a file ID', Boolean(uploaded.fileId), uploaded.fileId);
  check('Reported size matches', uploaded.size === original.length, `${uploaded.size} bytes`);

  try {
    const file = await storage.getFile(uploaded.fileId);
    const downloaded = await streamToBuffer(file.stream);
    check('Read-back content matches upload', downloaded.equals(original));
  } finally {
    const deleted = await storage.deleteFile(uploaded.fileId);
    check('Test file deleted', deleted === true);
  }

  try {
    await storage.getFile(uploaded.fileId);
    check('Deleted file is no longer readable', false);
  } catch (err) {
    check('Deleted file is no longer readable', err.code === 'NOT_FOUND', err.code);
  }

  console.log('\nNote: an empty "instructor-test-instructor" folder stays in Drive. Delete it by hand if you like.');
  if (results.includes(false)) process.exit(1);
  console.log('\nAll checks passed.');
}

main().catch((err) => {
  console.error(`\nTest failed: [${err.code || 'ERROR'}] ${err.message}\n`);
  process.exit(1);
});
