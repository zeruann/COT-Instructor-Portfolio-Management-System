require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google } = require('googleapis');

async function testOAuthSheets() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    console.log('1. Creating sheet with your system OAuth account...');
    const file = await drive.files.create({
      requestBody: {
        name: 'BukSU Faculty Compliance Checklist (Verified Test)',
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [rootFolderId],
      },
      fields: 'id, name, webViewLink',
    });

    const fileId = file.data.id;
    console.log('✅ Created Google Sheet! File ID:', fileId);
    console.log('👉 URL:', file.data.webViewLink);

    console.log('2. Populating cells with checklist data...');
    const res = await sheets.spreadsheets.values.update({
      spreadsheetId: fileId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['BUKIDNON STATE UNIVERSITY'],
          ['COLLEGE OF TECHNOLOGIES'],
          ['Faculty Compliance Checklist'],
          [''],
          ['Requirement', 'Status', 'Drive Link'],
          [
            'A. 1.0 Personal Data Sheet (PDS)',
            'Approved',
            '=HYPERLINK("https://drive.google.com", "☑ View File")',
          ],
        ],
      },
    });

    console.log('🎉 SUCCESS! Populated cells count:', res.data.updatedCells);
    console.log('🔗 YOUR WORKING GOOGLE SHEET IS READY:');
    console.log(file.data.webViewLink);
  } catch (err) {
    console.error('OAuth test error:', err.status, err.message);
  }
}

testOAuthSheets();
