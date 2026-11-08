// client/src/api/classes.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Fetch classes for the logged in instructor
 */
export async function fetchClasses(params = {}) {
  const res = await api.get('/classes', { params });
  return res.data;
}

/**
 * Fetch details and progress summary of a single class
 */
export async function fetchClassById(id) {
  const res = await api.get(`/classes/${id}`);
  return res.data;
}

/**
 * Create a new class
 */
export async function createClass(data) {
  const res = await api.post('/classes', data);
  return res.data;
}

/**
 * Update class details
 */
export async function updateClass(id, data) {
  const res = await api.patch(`/classes/${id}`, data);
  return res.data;
}

/**
 * Archive a class
 */
export async function archiveClass(id) {
  const res = await api.post(`/classes/${id}/archive`);
  return res.data;
}

/**
 * Unarchive a class
 */
export async function unarchiveClass(id) {
  const res = await api.post(`/classes/${id}/unarchive`);
  return res.data;
}

/**
 * Archive / delete a class
 */
export async function deleteClass(id) {
  const res = await api.delete(`/classes/${id}`);
  return res.data;
}

