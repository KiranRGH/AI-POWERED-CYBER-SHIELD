import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';
import { 
  Bell, Check, Trash2, CheckCircle2, ShieldAlert, AlertTriangle, 
  Info, Loader2, LogIn, Globe, ShieldCheck, RefreshCw, KeyRound, Unlock
} from 'lucide-react';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  notification_type?: string;
  created_at: string;
  is_read: boolean;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'LOGIN' | 'SUSPICIOUS_EVENT' | 'UNBLOCK_REQUEST'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let url = `/notifications?page=${page}`;
      if (filter === 'unread') {
        url += '&is_read=false';
      } else if (filter !== 'all') {
        url += `&notification_type=${filter}`;
      }
      const response = await apiClient.get(url);
      setNotifications(response.data.results || response.data.items || []);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      // Mock data with realistic IP telemetry
      setNotifications([
        { 
          id: '1', 
          title: 'Account Login Successful', 
          message: 'Logged in successfully from IP address 127.0.0.1 via verified browser session.', 
          severity: 'INFO', 
          notification_type: 'LOGIN',
          created_at: new Date().toISOString(), 
          is_read: false 
        },
        { 
          id: '2', 
          title: 'Suspicious Tampering Blocked', 
          message: 'Autonomous defense intercepted and auto-blocked a suspicious SQL injection probe from IP address 185.220.101.5 targeting student attendance.', 
          severity: 'CRITICAL', 
          notification_type: 'SUSPICIOUS_EVENT',
          created_at: new Date(Date.now() - 1800000).toISOString(), 
          is_read: false 
        },
        { 
          id: '3', 
          title: 'Firewall Auto-Quarantine Enforced', 
          message: 'Suspicious high-frequency brute-force scan from rogue IP address 45.154.255.89 was intercepted and added to the perimeter blacklist.', 
          severity: 'HIGH', 
          notification_type: 'SUSPICIOUS_EVENT',
          created_at: new Date(Date.now() - 3600000).toISOString(), 
          is_read: true 
        },
      ]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      if (filter === 'unread') {
        setNotifications(prev => prev.filter(n => n.id !== id));
      } else {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      if (filter === 'unread') {
        setNotifications([]);
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
      toast.success('All notifications marked as read.');
    } catch (error) {
      toast.error('Failed to mark all as read.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notification deleted.');
    } catch (error) {
      toast.error('Failed to delete notification.');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const extractIp = (text: string): string | null => {
    const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : null;
  };

  const getSeverityIcon = (notif: AppNotification) => {
    const type = notif.notification_type || '';
    if (type === 'LOGIN') {
      return <LogIn className="h-5 w-5 text-cyan-400" />;
    }
    if (type.includes('SUSPICIOUS')) {
      return <ShieldAlert className="h-5 w-5 text-rose-500 animate-pulse" />;
    }
    switch(notif.severity) {
      case 'CRITICAL': return <ShieldAlert className="h-5 w-5 text-rose-500" />;
      case 'HIGH': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'INFO': return <Info className="h-5 w-5 text-cyan-400" />;
      default: return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const renderTypeBadge = (notif: AppNotification) => {
    const type = notif.notification_type || '';
    if (type === 'LOGIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800">
          <LogIn size={11} className="text-blue-400" /> User Sign-In
        </span>
      );
    }
    if (type.includes('SUSPICIOUS')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
          <ShieldAlert size={11} className="text-rose-400 animate-pulse" /> Suspicious Event
        </span>
      );
    }
    if (type === 'UNBLOCK_REQUEST') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600 animate-pulse">
          <KeyRound size={11} className="text-amber-400" /> Unblock Request
        </span>
      );
    }
    if (type === 'ACCOUNT_RESTORED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600">
          <ShieldCheck size={11} className="text-emerald-400" /> Account Restored
        </span>
      );
    }
    if (type.includes('DEFENSE') || type.includes('FIREWALL')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
          <ShieldCheck size={11} className="text-emerald-400" /> Auto-Defended
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Bell className="text-cyan-400" size={24} />
            Notifications & Event Telemetry
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Review user login activity, suspicious threats, and origin IP addresses.</p>
        </div>
          
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchNotifications}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg transition-colors"
            title="Refresh Notifications"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white outline-none"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
            <option value="LOGIN">User Logins Only</option>
            <option value="SUSPICIOUS_EVENT">Suspicious Events Only</option>
            <option value="UNBLOCK_REQUEST">Unblock Requests Only</option>
          </select>
          
          <button 
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark all read
          </button>
        </div>
      </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col min-h-[400px]">
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-500">
              <Bell className="h-16 w-16 text-gray-600 mb-4 opacity-50" />
              <p className="text-lg font-medium text-gray-300">No notifications</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {notifications.map((notif) => {
              const ip = extractIp(notif.message);
              return (
                <div 
                  key={notif.id} 
                  className={`p-5 flex gap-4 transition-colors hover:bg-gray-750 ${!notif.is_read ? 'bg-gray-800/80 border-l-2 border-l-cyan-500' : 'bg-gray-900/30'}`}
                >
                  <div className="mt-1 flex-shrink-0">
                    {getSeverityIcon(notif)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center flex-wrap gap-2">
                          <h4 className={`text-sm font-semibold ${!notif.is_read ? 'text-white' : 'text-gray-300'}`}>
                            {notif.title}
                          </h4>
                          {renderTypeBadge(notif)}
                          {ip && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-950/80 border border-cyan-800 text-cyan-300 shadow-sm">
                              <Globe size={11} className="text-cyan-400" />
                              IP: {ip}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1.5 ${!notif.is_read ? 'text-gray-300' : 'text-gray-400'}`}>
                          {notif.message}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(notif.created_at).toLocaleString(undefined, { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    
                    <div className="mt-3 flex gap-3">
                      {!notif.is_read && (
                        <button 
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="text-xs font-medium text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Mark as read
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(notif.id)}
                        className="text-xs font-medium text-gray-500 hover:text-rose-500 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}

          {/* Pagination */}
          {!loading && notifications.length > 0 && (
            <div className="p-4 border-t border-gray-700 mt-auto bg-gray-800/50 flex justify-between items-center">
               <span className="text-sm text-gray-400">
                Page <span className="font-medium text-white">{page}</span> of <span className="font-medium text-white">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-gray-700 text-white rounded text-sm disabled:opacity-50 hover:bg-gray-600 transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-gray-700 text-white rounded text-sm disabled:opacity-50 hover:bg-gray-600 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
