// server/testSheets.js
const { createComplianceSheet } = require('./utils/sheetsService');

async function run() {
    console.log('Testing Google Sheets Service...');
    try {
        const result = await createComplianceSheet({
            instructorName: 'Prof. Juan Dela Cruz',
            department: 'College of Technologies',
            checklistData: [
                {
                    title: 'A. 1.0 Faculty Profile (Updated PDS)',
                    status: 'Approved',
                    driveFileId: 'sample-pds-file-id',
                },
                {
                    title: 'B. 1.0 Educational Attainment (TOR, Diploma)',
                    status: 'Approved',
                    driveFileId: 'sample-tor-file-id',
                },
                {
                    title: 'C. 1.0 Service Records',
                    status: 'Pending',
                    driveFileId: null,
                },
            ],
        });

        console.log('🎉 Sheet created successfully!');
        console.log('👉 Spreadsheet ID:', result.spreadsheetId);
        console.log('🔗 Open URL:', result.spreadsheetUrl);
    } catch (err) {
        console.error('Sheet creation failed:', err.message);
    }
}

run();
