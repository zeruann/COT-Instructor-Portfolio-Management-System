import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  RefreshCw,
  Info,
  ChevronRight,
  Loader2,
  UploadCloud,
  UserPlus,
  Mail,
} from 'lucide-react';
import PlaceholderPage from '../../components/layout/PlaceholderPage';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../api/notifications';

function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'IN';
}

function resolveAdminLink(link) {
  if (!link) return null;
  const match = link.match(/^\/admin\/faculty-portfolio\/([^/?#]+)/);
  if (match) {
    return `/admin/review/faculty-portfolio?instructorId=${match[1]}`;
  }
  return link;
}

function formatTimestamp(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const time = date.toLocaleTimeString('en-US', timeOptions);

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${month} ${date.getDate()}, ${time}`;
}

const getStyleByType = (type) => {
  switch (type) {
    case 'approved':
    case 'document_approved':
      return {
        icon: <Check size={18} className="text-emerald-600 stroke-[2.5]" />,
        iconBg: 'bg-emerald-100',
        titleColor: 'text-emerald-700 font-semibold',
      };
    case 'resubmission':
    case 'document_rejected':
      return {
        icon: <RefreshCw size={17} className="text-orange-600 stroke-[2.3]" />,
        iconBg: 'bg-orange-100',
        titleColor: 'text-orange-600 font-semibold',
      };
    case 'document_submitted':
      return {
        icon: <UploadCloud size={18} className="text-blue-600 stroke-[2.3]" />,
        iconBg: 'bg-blue-100',
        titleColor: 'text-blue-700 font-semibold',
      };
    case 'reminder':
      return {
        icon: <span className="text-base font-bold text-amber-700">!</span>,
        iconBg: 'bg-amber-100',
        titleColor: 'text-amber-700 font-semibold',
      };
    case 'notice':
    default:
      return {
        icon: <Info size={18} className="text-purple-600 stroke-[2.3]" />,
        iconBg: 'bg-purple-100',
        titleColor: 'text-[#474378] font-semibold',
      };
  }
};

function AdminNotifications() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      if (Array.isArray(data)) setNotifications(data);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      window.dispatchEvent(new Event('notifications-read'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif, followLink = true) => {
    if (!notif.readAt) {
      try {
        await markNotificationAsRead(notif._id || notif.id);
        setNotifications((prev) =>
          prev.map((n) =>
            (n._id || n.id) === (notif._id || notif.id)
              ? { ...n, readAt: new Date().toISOString() }
              : n
          )
        );
        window.dispatchEvent(new Event('notification-read'));
      } catch (err) {
        console.warn('Could not mark notification as read:', err);
      }
    }

    if (followLink) {
      const targetUrl = resolveAdminLink(notif.actionLink);
      if (targetUrl) {
        navigate(targetUrl);
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const submissionsCount = notifications.filter(
    (n) =>
      n.category === 'pending_review' ||
      n.type === 'document_submitted' ||
      n.type === 'resubmission'
  ).length;
  const systemCount = notifications.filter(
    (n) => n.category === 'system' || n.type === 'reminder' || n.type === 'notice' || n.type === 'approved'
  ).length;

  const tabs = [
    { id: 'all', label: `All (${notifications.length})` },
    { id: 'unread', label: `Unread (${unreadCount})` },
    { id: 'pending', label: `Submissions (${submissionsCount})` },
    { id: 'system', label: `System (${systemCount})` },
  ];

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.readAt;
    if (activeTab === 'pending') {
      return (
        item.category === 'pending_review' ||
        item.type === 'document_submitted' ||
        item.type === 'resubmission'
      );
    }
    if (activeTab === 'system') {
      return (
        item.category === 'system' ||
        item.type === 'reminder' ||
        item.type === 'notice' ||
        item.type === 'approved'
      );
    }
    return true;
  });

  return (
    <div className="mx-auto w-full space-y-6">
      <PlaceholderPage title="Notifications" />

      {/* Top Filter Buttons and Mark all as read */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-brand-purple text-white shadow-xs'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleMarkAllAsRead}
          className="self-start rounded-xl border border-brand-purple/40 bg-white px-5 py-2 text-sm font-medium text-brand-purple transition-colors hover:border-brand-purple hover:bg-brand-purple/5 sm:self-auto cursor-pointer"
        >
          Mark all as read
        </button>
      </div>

      {/* Main Notifications Card Container */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 size={24} className="animate-spin text-brand-purple mb-2" />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No notifications in this category.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notif) => {
              const notifId = notif._id || notif.id;
              const meta = getStyleByType(notif.type);
              const isUnread = !notif.readAt;
              const displayTime = formatTimestamp(notif.createdAt || notif.timestamp);
              const sender = notif.senderId;
              const senderPhoto = sender?.profile?.photoUrl || sender?.googlePhotoUrl;
              const senderName = sender?.fullName || 'Instructor';
              const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=f97316&color=fff&bold=true`;
              const avatarSrc = senderPhoto || fallbackAvatar;

              return (
                <div
                  key={notifId}
                  onClick={() => handleNotificationClick(notif, false)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notif, false)}
                  className={`flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between transition cursor-pointer ${
                    isUnread ? 'bg-purple-50/20 -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-xl' : ''
                  }`}
                >
                  {/* Left: Avatar/Icon badge, Title, Timestamp, Message */}
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={avatarSrc}
                        alt={senderName}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        className="h-11 w-11 rounded-full object-cover border border-gray-200 shadow-2xs"
                      />
                      <div
                        style={{ display: 'none' }}
                        className="h-11 w-11 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white shadow-2xs border border-gray-200"
                      >
                        {getInitials(senderName)}
                      </div>

                      {/* Small type badge on bottom-right of avatar */}
                      <div
                        className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-xs ${meta.iconBg}`}
                      >
                        {meta.icon}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${meta.titleColor}`}>
                          {notif.title || 'Notification'}
                        </span>
                        {displayTime && (
                          <span className="text-xs text-gray-400">{displayTime}</span>
                        )}
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-brand-purple" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 sm:text-sm">{notif.message}</p>
                      {notif.comment && notif.type !== 'approved' && notif.type !== 'document_approved' && (
                        <div className="mt-1.5 rounded-lg bg-gray-50 border border-gray-200/80 px-3 py-1.5 text-xs text-gray-600">
                          <span className="font-semibold text-gray-700">Remarks:</span> {notif.comment}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action button for notifications with a link */}
                  {notif.actionLink && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleNotificationClick(notif, true); }}
                      className="inline-flex shrink-0 items-center gap-1 self-start rounded-xl border border-brand-purple/40 bg-white px-4 py-2 text-sm font-medium text-brand-purple transition-colors hover:border-brand-purple hover:bg-brand-purple/5 sm:self-auto cursor-pointer"
                    >
                      View
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminNotifications;

