const storage = require('../utils/storageService');
const naming = require('../utils/driveNaming');

(async () => {
  console.log('Connection:', await storage.checkConnection());

  const folderPath = naming.facultyFolderPath({
    department: 'TEST Department',
    fullName: 'Test Instructor',
    instructorId: '000000000000000000000000',
    requirement: { checklistRef: 'B 1.0', card: 'Educational Attainment', inChecklist: true },
  });
  const fileName = naming.buildFileName({
    slot: 'Bachelors-TOR', version: 1, originalName: 'test.txt', documentId: 'abcd1234',
  });

  const up = await storage.uploadFile({
    folderPath, fileName, mimeType: 'text/plain', buffer: Buffer.from('drive test'),
  });
  console.log('Uploaded:', up);

  const file = await storage.getFile(up.fileId);
  const chunks = [];
  for await (const c of file.stream) chunks.push(c);
  console.log('Read back:', Buffer.concat(chunks).toString());

  console.log('Deleted test file:', await storage.deleteFile(up.fileId));
  console.log('Folder path used:', folderPath.join(' > '));
})().catch((e) => { console.error('FAILED:', e.code, e.message); process.exit(1); });