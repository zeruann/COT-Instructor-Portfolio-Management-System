import React from 'react';
import { History } from 'lucide-react';
import ActivityLogsTable from '../../components/ActivityLogsTable';

export default function AdminActivityLogs() {
  return (
    <>
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">
          Activity Logs
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Audit trail of administrator actions, system events, and faculty activities.
        </p>
      </div>

      <ActivityLogsTable role="admin" />
    </>
  );
}
