// client/src/api/documents.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Automatically inject JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Upload a document or re-upload a new version
 */
export async function uploadDocument({
  file,
  requirementKey,
  documentId,
  meta = {},
  slot = {},
  academicPeriodId,
  onProgress,
}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('requirementKey', requirementKey);

  if (documentId) {
    formData.append('documentId', documentId);
  }
  if (academicPeriodId) {
    formData.append('academicPeriodId', academicPeriodId);
  }
  if (meta && Object.keys(meta).length > 0) {
    formData.append('meta', JSON.stringify(meta));
  }
  if (slot && Object.keys(slot).length > 0) {
    formData.append('slot', JSON.stringify(slot));
  }

  const res = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return res.data;
}

/**
 * Fetch list of documents (by requirementKey, instructorId, etc.)
 */
export async function fetchDocuments(params = {}) {
  const res = await api.get('/documents', { params });
  return res.data;
}

/**
 * Fetch a single document by ID
 */
export async function fetchDocumentById(id) {
  const res = await api.get(`/documents/${id}`);
  return res.data;
}

/**
 * Helper to get the stream URL for previewing or downloading a file.
 * Automatically adds the JWT token as a query parameter or header for preview if needed,
 * or returns a streaming URL.
 */
export function getDocumentFileUrl(id, version) {
  const token = localStorage.getItem('token');
  const query = [];
  if (version) query.push(`version=${version}`);
  // Pass token as query param so <iframe> and <img> can load directly
  if (token) query.push(`token=${encodeURIComponent(token)}`);
  const qs = query.length ? `?${query.join('&')}` : '';
  return `${API_BASE}/documents/${id}/file${qs}`;
}

/**
 * Fetch stream as blob for authenticated download
 */
export async function downloadDocumentFile(id, version) {
  const res = await api.get(`/documents/${id}/file`, {
    params: { version },
    responseType: 'blob',
  });
  return res.data;
}

/**
 * Review a document (Admin only)
 */
export async function reviewDocument(id, { decision, comment }) {
  const res = await api.patch(`/documents/${id}/review`, { decision, comment });
  return res.data;
}

/**
 * Delete a document entry (Draft or Rejected only)
 */
export async function deleteDocument(id) {
  const res = await api.delete(`/documents/${id}`);
  return res.data;
}

/**
 * Get card summaries for Faculty Portfolio overview
 */
export async function fetchFacultySummary(instructorId) {
  const params = instructorId ? { instructorId } : {};
  const res = await api.get('/documents/summary/faculty', { params });
  return res.data;
}

/**
 * Fetch requirement details by key
 */
export async function fetchRequirement(key) {
  const res = await api.get(`/requirements/${key}`);
  return res.data;
}

/**
 * Fetch all requirements by scope
 */
export async function fetchRequirements(params = { scope: 'faculty' }) {
  const res = await api.get('/requirements', { params });
  return res.data;
}

export default api;
