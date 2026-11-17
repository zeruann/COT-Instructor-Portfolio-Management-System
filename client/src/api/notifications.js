// client/src/api/notifications.js
import axios from 'axios';

import { API_BASE } from './config';

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

export async function fetchNotifications(params = {}) {
  const res = await api.get('/notifications', { params });
  return res.data;
}

export async function fetchUnreadCount() {
  const res = await api.get('/notifications', { params: { category: 'unread' } });
  const data = res.data;
  if (Array.isArray(data)) return data.filter((n) => !n.readAt).length;
  return 0;
}

export async function markAllNotificationsAsRead() {
  const res = await api.patch('/notifications/mark-all-read');
  return res.data;
}

export async function markNotificationAsRead(id) {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
}

