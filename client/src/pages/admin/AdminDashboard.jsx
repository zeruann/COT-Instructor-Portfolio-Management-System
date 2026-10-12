import { Mail } from 'lucide-react';

function AdminDashboard() {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-6 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-shadow">
      <div className="flex items-center gap-3">
        <div className="bg-orange-50 p-2.5 rounded-xl">
          <Mail className="text-orange-500" size={20} />
        </div>
        <h2 className="font-semibold text-lg text-gray-800">ADMIN DASHBOARD</h2>
      </div>
    </div>
  );
}

export default AdminDashboard;
