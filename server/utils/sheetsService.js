// server/utils/sheetsService.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');
const { getSettingOrEnv } = require('../controllers/settingController');

/**
 * Returns authenticated Google Drive and Google Sheets API clients
 * using the system's verified OAuth2 credentials.
 */
async function getGoogleClients() {
  const clientId = await getSettingOrEnv('googleDriveClientId', 'GOOGLE_DRIVE_CLIENT_ID');
  const clientSecret = await getSettingOrEnv('googleDriveClientSecret', 'GOOGLE_DRIVE_CLIENT_SECRET');
  const refreshToken = await getSettingOrEnv('googleDriveRefreshToken', 'GOOGLE_DRIVE_REFRESH_TOKEN');
  const rootFolderId = await getSettingOrEnv('googleDriveRootFolderId', 'GOOGLE_DRIVE_ROOT_FOLDER_ID');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive / Sheets OAuth credentials missing in configuration.');
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return {
    drive: google.drive({ version: 'v3', auth }),
    sheets: google.sheets({ version: 'v4', auth }),
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
