import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCitizenStore } from '../../store/citizenStore';

const Notifications: React.FC = () => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useCitizenStore();
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Read'>('All');

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      read: notifications.filter(n => n.read).length,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'Unread') return !n.read;
      if (filter === 'Read') return n.read;
      return true;
    });
  }, [notifications, filter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        {stats.unread > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-slate-100 text-slate-600' },
          { label: 'Unread', value: stats.unread, color: 'bg-blue-50 text-blue-600' },
          { label: 'Read', value: stats.read, color: 'bg-green-50 text-green-600' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} p-4 rounded-xl border border-gray-100 text-center`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2 p-1 bg-gray-100 rounded-lg w-fit">
        {['All', 'Unread', 'Read'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === f
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredNotifications.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {filteredNotifications.map((n) => (
              <li
                key={n.id}
                className={`p-5 flex items-start space-x-4 transition-colors ${n.read ? 'bg-white' : 'bg-blue-50/50'}`}
              >
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-gray-300' : 'bg-blue-600'}`} />

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-bold uppercase tracking-tight px-1.5 py-0.5 rounded ${
                        n.category === 'Progress' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {n.category}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(n.date)}</span>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => markNotificationAsRead(n.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <p className={`text-sm ${n.read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
                      {n.message}
                    </p>
                    {n.complaintId && (
                      <button
                        onClick={() => navigate(`/citizen/complaint/${n.complaintId}`)}
                        className="text-xs text-blue-500 font-medium mt-1 hover:underline text-left"
                      >
                        Related to Complaint: {n.complaintId}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="text-4xl">🔔</div>
            <p className="text-gray-500">No notifications found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
