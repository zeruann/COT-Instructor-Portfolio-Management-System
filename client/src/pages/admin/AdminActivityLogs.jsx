import React from 'react';
import { History } from 'lucide-react';
import ActivityLogsTable from '../../components/ActivityLogsTable';

export default function AdminActivityLogs() {
  return (
    <>
      {/* PAGE HEADER */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-brand-purple sm:text-2xl tracking-tight">
          Activity Logs
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Audit trail of administrator actions, system events, and faculty activities.
        </p>
      </div>

      <ActivityLogsTable role="admin" />
    </>
  );
}
