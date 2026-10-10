// server/utils/storageService.js
//
// The ONLY module that talks to Google Drive. Controllers must never import
// `googleapis` themselves. Files stay private: nothing here creates a share
// link, and MongoDB should store only the returned `fileId`.
//
// Auth:    OAuth2 refresh token of the team-owned storage account, scope drive.file
// Layout:  <ROOT folder>/instructor-<instructorId>/<file>
//
// Required env vars (server/.env, never commit, never send to the frontend):
//   GOOGLE_DRIVE_CLIENT_ID
//   GOOGLE_DRIVE_CLIENT_SECRET
//   GOOGLE_DRIVE_REFRESH_TOKEN
//   GOOGLE_DRIVE_ROOT_FOLDER_ID
//
// Authorization (who may upload/view/delete) is NOT decided here. The calling
// controller must check ownership/role first, then call this service.

const { google } = require('googleapis');
const { Readable } = require('stream');

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

function getDrive() {
  if (driveClient) return driveClient;

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  const missing = [
    ['GOOGLE_DRIVE_CLIENT_ID', clientId],
    ['GOOGLE_DRIVE_CLIENT_SECRET', clientSecret],
    ['GOOGLE_DRIVE_REFRESH_TOKEN', refreshToken],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new StorageError('CONFIG', `Missing environment variables: ${missing.join(', ')}`);
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  // googleapis uses the refresh token to get fresh access tokens automatically.
  auth.setCredentials({ refresh_token: refreshToken });
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

function getRootFolderId() {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!id) throw new StorageError('CONFIG', 'Missing environment variable: GOOGLE_DRIVE_ROOT_FOLDER_ID');
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
  const drive = getDrive();
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
      .then(() => findOrCreateFolder(`instructor-${key}`, getRootFolderId()))
      .catch((err) => {
        folderCache.delete(key); // do not cache failures
        throw toStorageError(err);
      });
    folderCache.set(key, pending);
  }
  return folderCache.get(key);
}

// ---------- public API ----------

// Confirms credentials work and the root folder is reachable by this app.
async function checkConnection() {
  try {
    const res = await getDrive().files.get({
      fileId: getRootFolderId(),
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

// Uploads one file into the instructor's folder.
// `fileName` should be unique per version (e.g. "<requirementKey>_v2_<original>")
// because Drive allows duplicate names and does not overwrite.
// Returns { fileId, name, mimeType, size } -> store these on the document version.
async function uploadFile({ instructorId, buffer, fileName, mimeType }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new StorageError('BAD_INPUT', 'buffer must be a non-empty Buffer.');
  }
  requireNonEmptyString(fileName, 'fileName');
  requireNonEmptyString(mimeType, 'mimeType');

  try {
    const folderId = await ensureInstructorFolder(instructorId);
    const res = await getDrive().files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType, body: Readable.from(buffer) },
      fields: 'id, name, mimeType, size',
    });
    return {
      fileId: res.data.id,
      name: res.data.name,
      mimeType: res.data.mimeType,
      size: Number(res.data.size),
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
    const drive = getDrive();
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
    await getDrive().files.delete({ fileId });
    return true;
  } catch (err) {
    const mapped = toStorageError(err);
    if (mapped.code === 'NOT_FOUND') return false;
    throw mapped;
  }
}

module.exports = {
  StorageError,
  checkConnection,
  ensureInstructorFolder,
  uploadFile,
  getFile,
  deleteFile,
};
