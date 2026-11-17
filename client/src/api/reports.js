// client/src/api/reports.js
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

/**
 * Fetch compliance report preview data (instructor details, periods, faculty & class checklist, documents)
 */
export async function fetchComplianceReportData(params = {}) {
  const res = await api.get('/reports/compliance/data', { params });
  return res.data;
}

/**
 * Download the compliance checklist as an Excel (.xlsx) file
 */
export async function downloadComplianceExcel(params = {}) {
  const token = localStorage.getItem('token');
  const queryParams = new URLSearchParams(params).toString();
  const url = `${API_BASE}/reports/compliance/excel?${queryParams}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let errMsg = 'Failed to generate Excel report file.';
    try {
      const errData = await res.json();
      if (errData?.message) errMsg = errData.message;
    } catch {
      // ignore json parse error
    }
    throw new Error(errMsg);
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const fileName = `Compliance_Checklist_${params.schoolYear || 'Academic'}.xlsx`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Trigger export to Google Sheets
 */
export async function exportComplianceGoogleSheet(payload = {}) {
  const res = await api.post('/reports/compliance/sheets', payload);
  return res.data;
}

