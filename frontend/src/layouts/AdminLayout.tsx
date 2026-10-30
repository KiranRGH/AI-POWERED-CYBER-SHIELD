import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Shield, Bell, LogOut, Crown, Activity } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/axios';
import { toast } from 'sonner';
import { getNavItemsForRole } from '../config/navigation';

export const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevCountRef = useRef<number | null>(null);

  const role = (user?.role || 'ADMIN').toUpperCase();
  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMIN';
  const isAnalyst = role === 'ANALYST';

  const navItems = getNavItemsForRole(role);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await apiClient.get('/notifications?is_read=false');
        const items = res.data.results || res.data.items || [];
        if (isMounted) {
          const currentCount = items.length;
          if (prevCountRef.current !== null && currentCount > prevCountRef.current) {
            const latest = items[0];
            toast.info(`🔔 New Notification: ${latest?.title || 'Security Alert'}`, {
              description: latest?.message ? (latest.message.length > 75 ? `${latest.message.substring(0, 75)}...` : latest.message) : 'Click Bell icon to view all details'
            });
          }
          prevCountRef.current = currentCount;
          setUnreadCount(currentCount);
        }
      } catch {
        if (isMounted) setUnreadCount(0);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 overflow-hidden font-sans">
      {/* Sidebar - Clean, unified single-column navigation matching Image 2 */}
      <aside className={`flex-shrink-0 bg-gray-800 border-r border-gray-700 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} overflow-y-auto`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          {sidebarOpen && <span className="font-bold text-xl text-cyan-400">CyberShield AI</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-gray-700 rounded text-cyan-400">
            <Shield size={24} />
          </button>
        </div>
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-800 font-medium' 
                    : 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-transparent'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-cyan-400' : 'text-gray-400'} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex-shrink-0 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
          <div className="flex items-center flex-1">
             {/* Security Status Indicator */}
             <div className="flex items-center space-x-2 text-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-medium">System Secure</span>
             </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/notifications')} 
              title="Notifications & Security Events"
              className="relative p-2 text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-rose-500 text-white flex items-center justify-center border-2 border-gray-800">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="flex items-center space-x-3 border-l border-gray-700 pl-4">
              <div className="text-sm text-right hidden md:block">
                <p className="font-medium text-gray-200">{user?.full_name || 'System Administrator'}</p>
                {isSuperAdmin ? (
                  <p className="text-[11px] text-purple-400 font-semibold flex items-center justify-end gap-1">
                    <Crown size={12} className="text-purple-400" />
                    Super Administrator (Master Authority)
                  </p>
                ) : isAdmin ? (
                  <p className="text-[11px] text-cyan-400 font-semibold flex items-center justify-end gap-1">
                    <Shield size={12} className="text-cyan-400" />
                    System Administrator
                  </p>
                ) : isAnalyst ? (
                  <p className="text-[11px] text-blue-400 font-semibold flex items-center justify-end gap-1">
                    <Activity size={12} className="text-blue-400" />
                    Security Analyst
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">Student Account</p>
                )}
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border ${
                isSuperAdmin 
                  ? 'bg-purple-950 text-purple-300 border-purple-700' 
                  : isAdmin 
                  ? 'bg-cyan-950 text-cyan-400 border-cyan-700'
                  : isAnalyst
                  ? 'bg-blue-950 text-blue-400 border-blue-700'
                  : 'bg-gray-800 text-gray-300 border-gray-700'
              }`}>
                {user?.full_name?.charAt(0) || (isSuperAdmin ? 'S' : 'A')}
              </div>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 transition-colors" title="Log Out">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-900">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
