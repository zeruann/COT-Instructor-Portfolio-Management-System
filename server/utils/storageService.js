// server/utils/storageService.js
//
// The ONLY module that talks to Google Drive. Controllers must never import
// `googleapis` themselves. Files stay private: nothing here creates a share
// link, and MongoDB should store only the returned `fileId`.
//
// Auth:    OAuth2 refresh token of the team-owned storage account, scope drive.file
// Layout:  <ROOT>/<Department>/<Name [instructorId]>/Faculty Portfolio/<item>/<file>
//          <ROOT>/<Department>/<Name [instructorId]>/Class Portfolio/SY .../1st Sem/<class>/<file>
//          Folder paths are built by utils/driveNaming.js and passed in as `folderPath`.
//          The old flat layout (<ROOT>/instructor-<id>/) still works when `folderPath` is not given.
//
// Required env vars (server/.env, never commit, never send to the frontend):
//   GOOGLE_DRIVE_CLIENT_ID
//   GOOGLE_DRIVE_CLIENT_SECRET
//   GOOGLE_DRIVE_REFRESH_TOKEN
//   GOOGLE_DRIVE_ROOT_FOLDER_ID
//
// Authorization (who may upload/view/delete) is NOT decided here. The calling
// controller must check ownership/role first, then call this service.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { google } = require('googleapis');
const { Readable } = require('stream');
const { getSettingOrEnv } = require('../controllers/settingController');

const FOLDER_MIME = 'application/vnd.google-apps.folder';

class StorageError extends Error {
  // code: CONFIG | BAD_INPUT | AUTH | NOT_FOUND | QUOTA | RATE_LIMIT | UPLOAD_FAILED | DRIVE_ERROR
  constructor(code, message, cause) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

// ---------- configuration / client ----------

let driveClient = null;

function resetDriveClient() {
  driveClient = null;
  if (typeof folderCache !== 'undefined') folderCache.clear();
  if (typeof pathCache !== 'undefined') pathCache.clear();
}

async function getDrive() {
  if (driveClient) return driveClient;

  const clientId = await getSettingOrEnv('googleDriveClientId', 'GOOGLE_DRIVE_CLIENT_ID');
  const clientSecret = await getSettingOrEnv('googleDriveClientSecret', 'GOOGLE_DRIVE_CLIENT_SECRET');
  const refreshToken = await getSettingOrEnv('googleDriveRefreshToken', 'GOOGLE_DRIVE_REFRESH_TOKEN');

  const missing = [
    ['GOOGLE_DRIVE_CLIENT_ID', clientId],
    ['GOOGLE_DRIVE_CLIENT_SECRET', clientSecret],
    ['GOOGLE_DRIVE_REFRESH_TOKEN', refreshToken],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new StorageError('CONFIG', `Missing Google Drive credentials: ${missing.join(', ')}`);
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  // googleapis uses the refresh token to get fresh access tokens automatically.
  auth.setCredentials({ refresh_token: refreshToken });
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

async function getRootFolderId() {
  const id = await getSettingOrEnv('googleDriveRootFolderId', 'GOOGLE_DRIVE_ROOT_FOLDER_ID');
  if (!id) throw new StorageError('CONFIG', 'Missing Google Drive root folder ID.');
  return id;
}

// ---------- error mapping (never put tokens or request config in messages) ----------

function toStorageError(err, fallbackCode = 'DRIVE_ERROR') {
  if (err instanceof StorageError) return err;

  const status = Number(err?.response?.status ?? err?.status ?? err?.code);
  const apiError = err?.response?.data?.error;
  const apiText = typeof apiError === 'string' ? apiError : apiError?.message || '';
  const reasons = Array.isArray(apiError?.errors) ? apiError.errors.map((e) => e.reason) : [];

  if (
    err?.message === 'invalid_grant' ||
    ['invalid_grant', 'invalid_client', 'unauthorized_client'].includes(apiText) ||
    status === 401
  ) {
    return new StorageError(
      'AUTH',
      'Google Drive authorization failed or expired. Re-run server/scripts/driveAuthSetup.js and update GOOGLE_DRIVE_REFRESH_TOKEN.',
      err
    );
  }
  if (status === 404) return new StorageError('NOT_FOUND', 'File or folder not found in Google Drive.', err);
  if (reasons.includes('storageQuotaExceeded')) {
    return new StorageError('QUOTA', 'The Google Drive storage account is out of space.', err);
  }
  if (status === 429 || reasons.some((r) => /ratelimit/i.test(r))) {
    return new StorageError('RATE_LIMIT', 'Google Drive rate limit reached. Try again shortly.', err);
  }

  const detail = apiText || err?.message || 'unknown error';
  return new StorageError(fallbackCode, `Google Drive error (${Number.isNaN(status) ? 'no status' : status}): ${detail}`, err);
}

// ---------- helpers ----------

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new StorageError('BAD_INPUT', `${label} must be a non-empty string.`);
  }
}

function escapeQueryValue(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findOrCreateFolder(name, parentId) {
  const drive = await getDrive();
  const q = [
    `name = '${escapeQueryValue(name)}'`,
    `'${escapeQueryValue(parentId)}' in parents`,
    `mimeType = '${FOLDER_MIME}'`,
    'trashed = false',
  ].join(' and ');

  const found = await drive.files.list({ q, fields: 'files(id, name)', pageSize: 1, spaces: 'drive' });
  if (found.data.files && found.data.files.length) return found.data.files[0].id;

  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: 'id',
  });
  return created.data.id;
}

// Cache the folder lookup per instructor (one in-flight promise each) so two
// simultaneous uploads from the same instructor do not create two folders.
// This protects a single server process only.
const folderCache = new Map();

function ensureInstructorFolder(instructorId) {
  const key = String(instructorId ?? '');
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    return Promise.reject(new StorageError('BAD_INPUT', 'instructorId is missing or contains invalid characters.'));
  }
  if (!folderCache.has(key)) {
    const pending = Promise.resolve()
      .then(async () => {
        const rootId = await getRootFolderId();
        return findOrCreateFolder(`instructor-${key}`, rootId);
      })
      .catch((err) => {
        folderCache.delete(key); // do not cache failures
        throw toStorageError(err);
      });
    folderCache.set(key, pending);
  }
  return folderCache.get(key);
}


// Drive allows almost anything in a name, but these characters cause trouble for people and scripts.
function sanitizeName(value, max = 80) {
  const cleaned = String(value ?? '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, max).trim();
}

// Finds or creates a nested folder path under the root, e.g.
//   ensureFolderPath(['Information Technology', 'Maria Santos [665f...]', 'Faculty Portfolio'])
// Each level is cached by (parent, name) as an in-flight promise, so simultaneous uploads
// do not create duplicate folders. Protects a single server process only.
// Returns the id of the last folder.
const pathCache = new Map();

function ensureFolderPath(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return Promise.reject(new StorageError('BAD_INPUT', 'folderPath must be a non-empty array of folder names.'));
  }
  const names = segments.map((s) => sanitizeName(s));
  if (names.some((n) => !n)) {
    return Promise.reject(new StorageError('BAD_INPUT', 'folderPath contains an empty folder name.'));
  }

  const walk = async () => {
    let parentId = await getRootFolderId();
    for (const name of names) {
      const key = `${parentId}/${name}`;
      if (!pathCache.has(key)) {
        const pending = findOrCreateFolder(name, parentId).catch((err) => {
          pathCache.delete(key); // do not cache failures
          throw err;
        });
        pathCache.set(key, pending);
      }
      parentId = await pathCache.get(key);
    }
    return parentId;
  };

  return walk().catch((err) => {
    throw toStorageError(err);
  });
}

// ---------- public API ----------

// Confirms credentials work and the root folder is reachable by this app.
async function checkConnection() {
  try {
    const drive = await getDrive();
    const rootId = await getRootFolderId();
    const res = await drive.files.get({
      fileId: rootId,
      fields: 'id, name, mimeType, trashed',
    });
    if (res.data.mimeType !== FOLDER_MIME || res.data.trashed) {
      throw new StorageError('CONFIG', 'GOOGLE_DRIVE_ROOT_FOLDER_ID does not point to an active folder.');
    }
    return { rootFolderId: res.data.id, rootFolderName: res.data.name };
  } catch (err) {
    throw toStorageError(err);
  }
}

// Uploads one file. Pass `folderPath` (array of folder names, see utils/driveNaming.js) to use the
// agreed tree. Without it, the old flat <ROOT>/instructor-<id>/ folder is used.
// `fileName` should be unique per version (e.g. "<slot>_v2_<original>_<shortId>") because Drive
// allows duplicate names and does not overwrite.
// Returns { fileId, name, mimeType, size, checksum, folderId } -> store these on the document version.
async function uploadFile({ instructorId, folderPath, buffer, fileName, mimeType }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new StorageError('BAD_INPUT', 'buffer must be a non-empty Buffer.');
  }
  requireNonEmptyString(fileName, 'fileName');
  requireNonEmptyString(mimeType, 'mimeType');

  try {
    const folderId = folderPath ? await ensureFolderPath(folderPath) : await ensureInstructorFolder(instructorId);
    const drive = await getDrive();
    const res = await drive.files.create({
      requestBody: { name: sanitizeName(fileName, 150), parents: [folderId] },
      media: { mimeType, body: Readable.from(buffer) },
      fields: 'id, name, mimeType, size, md5Checksum',
    });
    return {
      fileId: res.data.id,
      name: res.data.name,
      mimeType: res.data.mimeType,
      size: Number(res.data.size),
      checksum: res.data.md5Checksum,
      folderId,
    };
  } catch (err) {
    throw toStorageError(err, 'UPLOAD_FAILED');
  }
}

// Returns { stream, name, mimeType, size }. The caller (after its own
// authorization check) pipes `stream` to the HTTP response and must handle
// stream 'error' events.
async function getFile(fileId) {
  requireNonEmptyString(fileId, 'fileId');
  try {
    const drive = await getDrive();
    const meta = await drive.files.get({ fileId, fields: 'id, name, mimeType, size, trashed' });
    if (meta.data.trashed) throw new StorageError('NOT_FOUND', 'File not found in Google Drive.');

    const media = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
    return {
      stream: media.data,
      name: meta.data.name,
      mimeType: meta.data.mimeType,
      size: Number(meta.data.size),
    };
  } catch (err) {
    throw toStorageError(err);
  }
}

// PERMANENT delete. Intended for cleaning up a failed/orphaned upload.
// Never use it to remove an old document version (versions must be preserved).
// Returns true if deleted, false if the file was already gone.
async function deleteFile(fileId) {
  requireNonEmptyString(fileId, 'fileId');
  try {
    const drive = await getDrive();
    await drive.files.delete({ fileId });
    return true;
  } catch (err) {
    const mapped = toStorageError(err);
    if (mapped.code === 'NOT_FOUND') return false;
    throw mapped;
  }
}

// Moves a folder under a different parent (for example when an instructor changes department).
// Drive keeps all file IDs, so nothing stored in MongoDB changes.
async function moveFolder(folderId, newParentId) {
  requireNonEmptyString(folderId, 'folderId');
  requireNonEmptyString(newParentId, 'newParentId');
  try {
    const drive = await getDrive();
    const meta = await drive.files.get({ fileId: folderId, fields: 'parents' });
    await drive.files.update({
      fileId: folderId,
      addParents: newParentId,
      removeParents: (meta.data.parents || []).join(','),
      fields: 'id',
    });
    pathCache.clear(); // cached (parent, name) pairs may now be wrong
    return true;
  } catch (err) {
    throw toStorageError(err);
  }
}

// Returns the parent folder ID of a file in Google Drive.
async function getFileParentFolderId(fileId) {
  if (!fileId || typeof fileId !== 'string') return null;
  try {
    const drive = await getDrive();
    const meta = await drive.files.get({ fileId, fields: 'parents' });
    return meta.data?.parents?.[0] || null;
  } catch {
    return null;
  }
}

// For tests only: lets a test replace the Drive client with a fake.
function __setDriveClientForTests(client) {
  driveClient = client;
  pathCache.clear();
  folderCache.clear();
}

module.exports = {
  StorageError,
  sanitizeName,
  checkConnection,
  ensureInstructorFolder,
  ensureFolderPath,
  getFileParentFolderId,
  uploadFile,
  getFile,
  deleteFile,
  moveFolder,
  resetDriveClient,
  __setDriveClientForTests,
};