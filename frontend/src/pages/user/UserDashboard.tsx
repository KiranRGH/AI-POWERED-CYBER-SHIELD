import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Activity, Bell, GraduationCap, Database, 
  Search, ArrowRight, CheckCircle2, Clock, AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/axios';
import { studentsAttendanceApi, StudentDetailResponse } from '../../api/studentsAttendance';
import { Link } from 'react-router-dom';

export const UserDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    events_analyzed: 0,
    threats_detected: 0,
    alerts_count: 0,
    students_tracked: 6,
    system_status: 'System Secure',
    recent_activity: [] as Array<{ title: string; detail: string; time: string }>
  });
  const [unblockRequestsCount, setUnblockRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const role = (user?.role || 'USER').toUpperCase();
  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMIN';
  const isStaff = isSuperAdmin || isAdmin;

  // Quick Roll Number search state
  const [quickUSN, setQuickUSN] = useState('');
  const [searchedStudent, setSearchedStudent] = useState<StudentDetailResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get('/dashboard');
        setStats(res.data);
      } catch {
        // Fallback default clean zero-state
      } finally {
        setLoading(false);
      }

      if (isStaff) {
        try {
          const usersRes = await apiClient.get('/admin/users?page=1&page_size=100');
          if (usersRes?.data?.items) {
            const reqs = usersRes.data.items.filter((u: any) => u.unblock_requested).length;
            setUnblockRequestsCount(reqs);
          }
        } catch {
          // ignore
        }
      }
    };
    fetchDashboard();
  }, [isStaff]);

  const handleQuickSearch = async (usnToSearch?: string) => {
    const target = (usnToSearch || quickUSN).trim().toUpperCase();
    if (!target) return;
    setSearchLoading(true);
    try {
      const data = await studentsAttendanceApi.getStudentDetails(target);
      setSearchedStudent(data);
    } catch {
      setSearchedStudent(null);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner matching exact previous interface */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-semibold text-cyan-400 tracking-wider">
              YOUR SECURE WORKSPACE
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              <ShieldCheck size={12} className="text-emerald-400" />
              Automatic Threat Blocking: Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-100 mt-1">
            Welcome, {user?.full_name || 'System Administrator'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Your personal dashboard with real-time autonomous threat blocking and attendance integrity protection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/attendance"
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-900/20"
          >
            <GraduationCap size={18} />
            <span>Attendance & Tamper Defense</span>
          </Link>
        </div>
      </div>

      {/* Subtle Unblock Requests Alert (for Administrators) */}
      {unblockRequestsCount > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-3.5 flex items-center justify-between text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-400" />
            <span className="text-xs font-semibold">
              {unblockRequestsCount} Account Unblock Request(s) Pending Review
            </span>
          </div>
          <Link
            to="/admin/users"
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors shadow"
          >
            Review in User Management →
          </Link>
        </div>
      )}

      {/* 4 Verified Metric Cards matching exact previous interface */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Threats on Your Account</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                {stats.threats_detected}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ShieldCheck size={22} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-400" /> All systems normal (Clean slate)
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Events Analyzed</p>
              <h3 className="text-2xl font-bold text-gray-100 mt-1 font-mono">
                {stats.events_analyzed}
              </h3>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Activity size={22} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Network sessions monitored</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Active Security Alerts</p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1 font-mono">
                {stats.alerts_count}
              </h3>
            </div>
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Bell size={22} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Zero unread security notifications</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Students Tracked</p>
              <h3 className="text-2xl font-bold text-gray-100 mt-1 font-mono">
                {stats.students_tracked}
              </h3>
            </div>
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg">
              <GraduationCap size={22} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Registered student profiles</p>
        </div>
      </div>

      {/* Quick Roll Number Attendance Lookup matching exact previous interface */}
      <div className="bg-gray-800 rounded-2xl border border-cyan-800/60 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Database className="text-cyan-400" size={20} />
              Quick Student Attendance Lookup
            </h3>
            <p className="text-xs text-gray-400">
              Format: <span className="text-cyan-300 font-mono font-semibold">1(College: CK)(Year: 21)(Branch: CS)(Roll: 045)</span> e.g. <span className="font-mono text-cyan-400 font-bold">1CK21CS045</span>
            </p>
          </div>

          <Link
            to="/attendance"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
          >
            <span>Open Full Attendance Manager</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={quickUSN}
              onChange={(e) => setQuickUSN(e.target.value.toUpperCase())}
              placeholder="Enter Student Roll Number e.g. 1CK21CS045"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-xs text-gray-100 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={() => handleQuickSearch()}
            disabled={searchLoading}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {searchLoading ? 'Searching...' : 'Check Attendance'}
          </button>
        </div>

        {/* Quick Result Preview */}
        {searchedStudent ? (
          <div className="bg-gray-900/90 rounded-xl p-4 border border-gray-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cyan-900/40 border border-cyan-700 flex items-center justify-center text-cyan-400 font-bold text-sm">
                {searchedStudent.student.full_name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {searchedStudent.student.roll_number}
                  </span>
                  <span className="text-gray-200 font-medium text-xs">
                    {searchedStudent.student.full_name}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {searchedStudent.student.college_name} • {searchedStudent.student.branch} Engineering
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Attendance Rate</span>
                <span className={`text-xl font-mono font-extrabold ${
                  searchedStudent.stats.attendance_percentage >= 75 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {searchedStudent.stats.attendance_percentage}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Classes</span>
                <span className="text-sm font-semibold text-gray-200">
                  {searchedStudent.stats.present} / {searchedStudent.stats.total_classes}
                </span>
              </div>
              <Link
                to="/attendance"
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-800 rounded-lg text-xs font-medium"
              >
                View Full Logs
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gray-900/60 rounded-xl border border-gray-750 text-center">
            <Search className="text-gray-500 mx-auto mb-2" size={24} />
            <p className="text-xs text-gray-300 font-medium">Search for your USN</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Enter your student roll number (e.g. 1CK21CS045) above to view attendance records and tamper integrity status.
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity / Audit Feed */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
          <Clock className="text-cyan-400" size={18} />
          Your Recent Security Activity
        </h3>

        {stats.recent_activity.length > 0 ? (
          <div className="space-y-3">
            {stats.recent_activity.map((act, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-700/60 last:border-0 text-xs">
                <div>
                  <p className="text-gray-200 font-medium">{act.title}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{act.detail}</p>
                </div>
                <span className="text-gray-400 text-[11px] font-mono">{act.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-gray-900/50 rounded-xl border border-gray-800">
            <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-medium text-gray-300">Clean Slate — No Anomalies Detected</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Your security logs will populate here as you interact with protected resources and academic records.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
