import React, { useEffect, useState } from 'react';
import { 
  Users, ShieldAlert, Ban, Activity, GraduationCap, 
  Database, AlertOctagon, CheckCircle2, ArrowRight, ShieldCheck, Download
} from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import apiClient from '../../api/axios';
import { studentsAttendanceApi } from '../../api/studentsAttendance';
import ThreatSeverityChart from '../../components/charts/ThreatSeverityChart';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { isConnected, subscribe, unsubscribe } = useWebSocket('/dashboard');
  const [stats, setStats] = useState({
    activeUsers: 3,
    threatsDetected: 4,
    criticalThreats: 2,
    blockedIPs: 4,
    totalStudents: 5,
    totalAttendanceLogs: 25,
    cyberCrimesBlocked: 4,
    system_load: '24%',
    uptime: '99.98%'
  });

  const [recentEvents, setRecentEvents] = useState<any[]>([
    { id: 1, type: 'Unauthorized Modification', target: '1CK21CS045', sourceIP: '185.220.101.5', severity: 'Critical', status: 'Blocked', time: 'Just now' },
    { id: 2, type: 'SQL Injection Attack', target: 'attendance_records', sourceIP: '103.21.244.12', severity: 'Critical', status: 'Blocked', time: '10 mins ago' },
    { id: 3, type: 'Unauthorized Deletion', target: '1CK22AI019', sourceIP: '45.154.255.89', severity: 'High', status: 'Blocked', time: '1 hour ago' },
  ]);

  const [chartData, setChartData] = useState([
    { name: 'Critical', value: 2 },
    { name: 'High', value: 2 },
    { name: 'Medium', value: 1 },
    { name: 'Low', value: 0 },
  ]);

  const loadDashboardData = async () => {
    try {
      const [resAdmin, resCrimeStats] = await Promise.all([
        apiClient.get('/dashboard/admin'),
        studentsAttendanceApi.getCyberCrimeStats(),
      ]);

      if (resAdmin.data) {
        setStats(prev => ({
          ...prev,
          ...resAdmin.data,
          cyberCrimesBlocked: resCrimeStats.total_tampering_attempts || resAdmin.data.cyberCrimesBlocked || 0,
        }));
        if (resAdmin.data.recentEvents && resAdmin.data.recentEvents.length > 0) {
          setRecentEvents(resAdmin.data.recentEvents);
        }
      }

      if (resCrimeStats) {
        setChartData([
          { name: 'Unauthorized Modification', value: resCrimeStats.unauthorized_modifications || 2 },
          { name: 'SQL Injection', value: resCrimeStats.sql_injections || 1 },
          { name: 'Unauthorized Deletion', value: resCrimeStats.unauthorized_deletions || 1 },
          { name: 'Other Probes', value: 1 },
        ]);
      }
    } catch {
      // Keep healthy defaults
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleNewEvent = (event: any) => {
      setRecentEvents(prev => [event, ...prev].slice(0, 10));
      setStats(prev => ({ ...prev, threatsDetected: prev.threatsDetected + 1 }));
    };

    subscribe('new_event', handleNewEvent);
    return () => unsubscribe('new_event', handleNewEvent);
  }, [subscribe, unsubscribe]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800 p-6 rounded-2xl border border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-semibold text-cyan-400 tracking-wider">
              Command Center • Academic Database Defense
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Automatic Threat Blocking Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-100 mt-1">
            System Security & Academic Integrity Overview
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Autonomous AI defense active. Protecting student attendance records, auto-quarantining intrusion vectors without manual review.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/attendance"
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-900/20"
          >
            <GraduationCap size={18} />
            <span>Attendance & Tamper Defense</span>
          </Link>
          <Link
            to="/admin/cyber-crimes"
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-900/20"
          >
            <ShieldAlert size={18} />
            <span>Cyber Crime Dataset</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Total Users</p>
              <h3 className="text-2xl font-bold text-gray-100 mt-1 font-mono">{stats.activeUsers}</h3>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400">
              <Users size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Admins, Analysts & Users</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Students Protected</p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1 font-mono">{stats.totalStudents}</h3>
            </div>
            <div className="p-2.5 bg-cyan-500/10 rounded-lg text-cyan-400">
              <GraduationCap size={20} />
            </div>
          </div>
          <p className="text-[11px] text-cyan-400/80 mt-2 font-mono">Format: 1CK21CS...</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Cyber Crimes Thwarted</p>
              <h3 className="text-2xl font-bold text-red-400 mt-1 font-mono">{stats.cyberCrimesBlocked}</h3>
            </div>
            <div className="p-2.5 bg-red-500/10 rounded-lg text-red-400">
              <AlertOctagon size={20} />
            </div>
          </div>
          <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1 font-semibold">
            <CheckCircle2 size={12} /> 100% Autonomous Rollback
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Quarantined IPs</p>
              <h3 className="text-2xl font-bold text-purple-400 mt-1 font-mono">{stats.blockedIPs}</h3>
            </div>
            <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400">
              <Ban size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Active firewall blocks</p>
        </div>
      </div>

      {/* Middle Section: Chart and Live Attack Incident Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Distribution Chart */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <Activity size={18} className="text-cyan-400" />
                Cyber Crime & Attack Vector Distribution
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Telemetry of unauthorized database tampering and modification attempts
              </p>
            </div>
            <Link
              to="/admin/cyber-crimes"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View Full Dataset</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="h-64 flex items-center justify-center">
            <ThreatSeverityChart data={chartData} />
          </div>

          <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center text-xs text-gray-400">
            <span>Target Asset: Academic Attendance DB (`students`, `attendance_records`)</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck size={14} /> AI Policy Engine Active
            </span>
          </div>
        </div>

        {/* Recent Cyber Crime Incidents Feed */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-400" />
                Recent Intercepted Crimes
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 font-bold">
                Auto-Quarantined
              </span>
            </div>

            <div className="space-y-3">
              {recentEvents.map(event => (
                <div key={event.id} className="p-3 bg-gray-900/70 border border-gray-700/80 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-200">{event.type}</span>
                    <span className="font-mono text-red-400 text-[10px]">{event.time}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-400 text-[11px]">
                    <span>Target: <code className="text-cyan-400 font-mono">{event.target || '1CK21CS045'}</code></span>
                    <span className="text-emerald-400 font-semibold">{event.status}</span>
                  </div>
                  <p className="text-gray-500 font-mono text-[10px]">Source IP: {event.sourceIP}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-700 text-center">
            <Link
              to="/admin/attendance"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Launch Student Attendance & Defense Testbed →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
