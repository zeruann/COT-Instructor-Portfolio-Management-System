import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  RefreshCw,
  Info,
  ChevronRight,
  Loader2,
  Trash2,
} from 'lucide-react';
import PlaceholderPage from '../../components/layout/PlaceholderPage';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { getNotificationTitle } from '../../utils/notificationDisplay';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../../api/notifications';

function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AD';
}

function formatTimestamp(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const time = date.toLocaleTimeString('en-US', timeOptions);

  if (diffDays === 0) {
    return `Today, ${time}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${time}`;
  } else {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}, ${time}`;
  }
}

function InstructorNotifications() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null); // { type: 'single', notif } | { type: 'all' }
  const [deleting, setDeleting] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
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
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      window.dispatchEvent(new Event('notifications-read'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.type === 'all') {
        await clearAllNotifications();
        setNotifications([]);
        window.dispatchEvent(new Event('notifications-read'));
      } else {
        const notif = pendingDelete.notif;
        const id = notif._id || notif.id;
        await deleteNotification(id);
        setNotifications((prev) =>
          prev.filter((n) => (n._id || n.id) !== id)
        );
        window.dispatchEvent(
          new CustomEvent('notification-deleted', {
            detail: { unread: !notif.readAt },
          })
        );
      }
      setPendingDelete(null);
    } catch (err) {
      console.error('Failed to delete notification(s):', err);
    } finally {
      setDeleting(false);
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

    if (followLink && notif.actionLink) {
      navigate(notif.actionLink);
    }
  };
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const pendingCount = notifications.filter(
    (n) => n.category === 'pending_review' || n.type === 'resubmission' || n.type === 'document_rejected'
  ).length;
  const systemCount = notifications.filter(
    (n) => n.category === 'system' || n.type === 'reminder' || n.type === 'notice'
  ).length;

  const tabs = [
    { id: 'all', label: `All (${notifications.length})` },
    { id: 'unread', label: `Unread (${unreadCount})` },
    { id: 'pending', label: `Pending Review (${pendingCount})` },
    { id: 'system', label: `System (${systemCount})` },
  ];

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.readAt;
    if (activeTab === 'pending')
      return (
        item.category === 'pending_review' ||
        item.type === 'resubmission' ||
        item.type === 'document_rejected'
      );
    if (activeTab === 'system')
      return item.category === 'system' || item.type === 'reminder' || item.type === 'notice';
    return true;
  });

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

  return (
    <div className="mx-auto w-full space-y-6">
      {/* Page Title */}
      <PlaceholderPage
        title="Notifications"
        subtitle="Stay updated on portfolio review statuses, comments, and system announcements."
      />

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
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors cursor-pointer ${isActive
                    ? 'bg-brand-orange text-white shadow-xs'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="rounded-xl border border-brand-purple/40 bg-white px-5 py-2 text-sm font-medium text-brand-purple transition-colors hover:border-brand-purple hover:bg-brand-purple/5 cursor-pointer"
          >
            Mark all as read
          </button>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => setPendingDelete({ type: 'all' })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
            >
              <Trash2 size={15} />
              Delete all
            </button>
          )}
        </div>
      </div>

      {/* Main Notifications Card Container */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 size={24} className="animate-spin text-brand-orange mb-2" />
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
              const isReviewNotif = ['approved', 'document_approved', 'resubmission', 'document_rejected'].includes(notif.type);
              const senderName = sender?.fullName || (isReviewNotif ? 'Administrator' : 'System Notice');
              const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=f97316&color=fff&bold=true`;
              const avatarSrc = senderPhoto || fallbackAvatar;

              return (
                <div
                  key={notifId}
                  onClick={() => handleNotificationClick(notif, true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notif, true)}
                  className={`flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between transition ${notif.actionLink ? 'cursor-pointer hover:bg-gray-50/60 rounded-xl' : ''
                    } ${isUnread ? 'bg-orange-50/20 -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-xl' : ''
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
                          {getNotificationTitle(notif)}
                        </span>
                        {displayTime && (
                          <span className="text-xs text-gray-400">
                            {displayTime}
                          </span>
                        )}
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-brand-orange" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 sm:text-sm">
                        {notif.message}
                      </p>
                      {notif.comment && notif.type !== 'approved' && notif.type !== 'document_approved' && (
                        <div className="mt-1.5 rounded-lg bg-gray-50 border border-gray-200/80 px-3 py-1.5 text-xs text-gray-600">
                          <span className="font-semibold text-gray-700">Admin Remarks:</span> {notif.comment}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Open Portfolio chevron (only when there's a link) + Delete */}
                  <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                    {notif.actionLink && (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-brand-purple/40 bg-white px-4 py-2 text-sm font-medium text-brand-purple">
                        Open portfolio
                        <ChevronRight size={16} />
                      </span>
                    )}

                    <button
                      type="button"
                      title="Delete notification"
                      aria-label="Delete notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete({ type: 'single', notif });
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmationModal
        open={Boolean(pendingDelete)}
        variant="danger"
        title={
          pendingDelete?.type === 'all'
            ? 'Delete all notifications?'
            : 'Delete this notification?'
        }
        message={
          pendingDelete?.type === 'all'
            ? 'All of your notifications will be permanently deleted. This action cannot be undone.'
            : 'This notification will be permanently deleted. This action cannot be undone.'
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setPendingDelete(null)}
      />
    </div>
  );
}

export default InstructorNotifications;
