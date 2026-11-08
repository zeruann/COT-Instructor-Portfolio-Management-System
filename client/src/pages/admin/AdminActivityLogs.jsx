import React from 'react';
import { History } from 'lucide-react';
import ActivityLogsTable from '../../components/ActivityLogsTable';

export default function AdminActivityLogs() {
  return (
    <>
      {/* PAGE HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">

          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Activity Logs</h1>
        </div>
        <p className="text-sm text-gray-500">
          Audit trail of administrator actions, system events, and faculty activities.
        </p>
      </div>

      <ActivityLogsTable role="admin" />
    </>
  );
}
