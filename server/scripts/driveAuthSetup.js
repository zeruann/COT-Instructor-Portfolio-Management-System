// server/scripts/driveAuthSetup.js
//
// ONE-TIME setup. Run it on your own computer:   node scripts/driveAuthSetup.js
// Later, only if the refresh token stops working:  node scripts/driveAuthSetup.js --token-only
//
// What it does:
//   1. Opens a temporary local page (127.0.0.1) to receive Google's sign-in result.
//   2. You sign in as the STORAGE Google account and click Allow.
//   3. Prints GOOGLE_DRIVE_REFRESH_TOKEN and GOOGLE_DRIVE_ROOT_FOLDER_ID for you to
//      paste into server/.env.
//
// Why it creates the root folder itself: the drive.file scope only lets this app
// see files/folders IT created. A folder you made by hand in the Drive website
// would not be accessible to the server.
//
// Needs in server/.env first: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET
// (from an OAuth client of type "Desktop app").

const path = require('path');
const http = require('http');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { google } = require('googleapis');

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const ROOT_FOLDER_NAME = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'COT E-Portfolio Files';
const TIMEOUT_MS = 5 * 60 * 1000;

async function main() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in server/.env first.');
  }
  const tokenOnly = process.argv.includes('--token-only');
  if (!tokenOnly && process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID && !process.argv.includes('--force')) {
    throw new Error(
      'GOOGLE_DRIVE_ROOT_FOLDER_ID is already set in .env. Running this normally creates a SECOND root folder.\n' +
        '  - Need only a new refresh token (e.g. the old one expired)?  node scripts/driveAuthSetup.js --token-only\n' +
        '  - Really want a new root folder?                              node scripts/driveAuthSetup.js --force'
    );
  }

  const state = crypto.randomBytes(16).toString('hex');
  let oauth2;

  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error('Timed out waiting for Google sign-in (5 minutes). Run the script again.'));
    }, TIMEOUT_MS);

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/') {
        res.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get('error');
      const gotCode = url.searchParams.get('code');
      const gotState = url.searchParams.get('state');

      const finish = (status, message, err, value) => {
        res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(message);
        clearTimeout(timer);
        server.close();
        err ? reject(err) : resolve(value);
      };

      if (error) return finish(400, `Google returned an error: ${error}. You can close this tab.`, new Error(`Google sign-in failed: ${error}`));
      if (gotState !== state) return finish(400, 'State mismatch. Close this tab and run the script again.', new Error('OAuth state mismatch.'));
      if (!gotCode) return finish(400, 'No code received.', new Error('No authorization code received.'));
      finish(200, 'Done. You can close this tab and return to the terminal.', null, gotCode);
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      oauth2 = new google.auth.OAuth2(clientId, clientSecret, `http://127.0.0.1:${port}`);
      const authUrl = oauth2.generateAuthUrl({
        access_type: 'offline', // needed to receive a refresh token
        prompt: 'consent', // forces a refresh token even if consent was given before
        scope: [SCOPE],
        state,
      });
      console.log('\n1) Open this link in a browser where the STORAGE Google account is signed in:\n');
      console.log(authUrl);
      console.log('\n2) Click Allow. Waiting for Google (up to 5 minutes)...\n');
    });
    server.on('error', reject);
  });

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Remove this app at https://myaccount.google.com/permissions ' +
        'for the storage account, then run the script again.'
    );
  }
  oauth2.setCredentials(tokens);

  if (tokenOnly) {
    console.log('Success. Replace this line in server/.env (keep the token secret):\n');
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nClear this terminal afterwards so the token is not left on screen.\n');
    return;
  }

  const drive = google.drive({ version: 'v3', auth: oauth2 });
  const folder = await drive.files.create({
    requestBody: { name: ROOT_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id, name',
  });

  console.log('Success. Add these two lines to server/.env (keep the token secret):\n');
  console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GOOGLE_DRIVE_ROOT_FOLDER_ID=${folder.data.id}`);
  console.log(`\nA folder named "${folder.data.name}" now exists in the storage account's My Drive.`);
  console.log('Clear this terminal afterwards so the token is not left on screen.\n');
}

main().catch((err) => {
  console.error(`\nSetup failed: ${err.message}\n`);
  process.exit(1);
});
