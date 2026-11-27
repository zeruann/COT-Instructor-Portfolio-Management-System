// server/utils/sheetsService.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');
const { getSettingOrEnv } = require('../controllers/settingController');

/**
 * Returns authenticated Google Drive and Google Sheets API clients
 * using the configured Google Sheets Service Account credentials (from Settings or .env)
 * and the system's Drive OAuth2 storage client.
 */
async function getGoogleClients() {
  const clientEmail = await getSettingOrEnv('googleSheetsClientEmail', 'GOOGLE_SHEETS_CLIENT_EMAIL');
  const rawPrivateKey = await getSettingOrEnv('googleSheetsPrivateKey', 'GOOGLE_SHEETS_PRIVATE_KEY');

  if (!clientEmail || !rawPrivateKey) {
    throw new Error('Google Sheets API Service Account credentials are missing in Settings or .env.');
  }

  const privateKey = rawPrivateKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

  const sheetsAuth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  // Verify the Google Sheets service account credentials
  await sheetsAuth.authorize();

  // Use Drive OAuth2 for file creation inside rootFolderId (avoids 0-byte service account Drive quota limits)
  const driveClientId = await getSettingOrEnv('googleDriveClientId', 'GOOGLE_DRIVE_CLIENT_ID');
  const driveClientSecret = await getSettingOrEnv('googleDriveClientSecret', 'GOOGLE_DRIVE_CLIENT_SECRET');
  const driveRefreshToken = await getSettingOrEnv('googleDriveRefreshToken', 'GOOGLE_DRIVE_REFRESH_TOKEN');
  const rootFolderId = await getSettingOrEnv('googleDriveRootFolderId', 'GOOGLE_DRIVE_ROOT_FOLDER_ID');

  let driveAuth = sheetsAuth;
  if (driveClientId && driveClientSecret && driveRefreshToken) {
    const oauth2 = new google.auth.OAuth2(driveClientId, driveClientSecret);
    oauth2.setCredentials({ refresh_token: driveRefreshToken });
    driveAuth = oauth2;
  }

  return {
    drive: google.drive({ version: 'v3', auth: driveAuth }),
    sheets: google.sheets({ version: 'v4', auth: sheetsAuth }),
    sheetsAuth,
    driveAuth,
    rootFolderId,
  };
}

/**
 * Creates a new Google Sheet for the Faculty Compliance Checklist and populates it
 */
async function createComplianceSheet({ instructorName, department, checklistData = [] }) {
  const { drive, sheets, rootFolderId } = await getGoogleClients();

  // 1. Create the spreadsheet inside the designated Google Drive folder
  const file = await drive.files.create({
    requestBody: {
      name: `Compliance Checklist - ${instructorName || 'Faculty'}`,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      ...(rootFolderId ? { parents: [rootFolderId] } : {}),
    },
    fields: 'id, name, webViewLink',
  });

  const spreadsheetId = file.data.id;
  const spreadsheetUrl = file.data.webViewLink;

  // 2. Prepare BukSU Compliance Checklist cell structure
  const values = [
    ['BUKIDNON STATE UNIVERSITY'],
    ['COLLEGE OF TECHNOLOGIES'],
    ['Faculty Compliance Checklist'],
    [''],
    ['Faculty Name:', instructorName || '—', '', 'Department:', department || '—'],
    ['Date:', new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })],
    [''],
    ['Requirement / Document', 'Status', 'Drive Link'],
  ];

  checklistData.forEach((item) => {
    const linkFormula = item.driveFileId
      ? `=HYPERLINK("https://drive.google.com/file/d/${item.driveFileId}/view", "☑ View Document")`
      : '☐ Not Submitted';

    values.push([item.title || item.name, item.status || 'Pending', linkFormula]);
  });

  // 3. Write data into the new Sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return {
    spreadsheetId,
    spreadsheetUrl,
  };
}

module.exports = {
  createComplianceSheet,
  getGoogleClients,
};
