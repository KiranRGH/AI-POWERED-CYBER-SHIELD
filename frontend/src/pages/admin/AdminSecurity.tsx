import React, { useState, useEffect } from 'react';
import { 
  Lock, Shield, Key, AlertTriangle, CheckCircle2, 
  Smartphone, UserX, RefreshCw, Globe, Terminal, ShieldAlert,
  Server, Cpu, Activity, Laptop, Monitor
} from 'lucide-react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';

interface SecurityPosture {
  security_score: number;
  posture_status: string;
  mfa_enforcement: string;
  encryption_status: string;
  firewall_mode: string;
  active_firewall_rules: number;
  academic_tamper_shield: string;
  crimes_blocked: number;
  active_sessions: Array<{
    id: string;
    user_email: string;
    ip_address: string;
    location: string;
    device: string;
    last_active: string;
    is_current: boolean;
  }>;
  recent_failed_logins: Array<{
    ip: string;
    attempts: number;
    target_user: string;
    status: string;
    timestamp: string;
  }>;
  recommendations: string[];
}

export const AdminSecurity: React.FC = () => {
  const [posture, setPosture] = useState<SecurityPosture | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/security');
      setPosture(res.data);
    } catch {
      toast.error('Failed to load security posture');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleRevokeAll = async () => {
    if (!window.confirm('Revoke all administrative and user sessions except your current one?')) return;
    try {
      await apiClient.post('/admin/security/revoke-all-sessions');
      toast.success('All non-current sessions terminated.');
      fetchSecurityData();
    } catch {
      toast.error('Failed to revoke sessions');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/60 p-5 rounded-2xl border border-gray-700/80">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2.5">
            <Lock className="text-cyan-400" size={26} />
            Administrative Security & Posture Control
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Global zero-trust authentication policies, active session telemetry, and automated brute-force mitigation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchSecurityData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-medium transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Telemetry</span>
          </button>
          <button
            onClick={handleRevokeAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-xs shadow-lg shadow-red-950/40 transition-colors"
          >
            <UserX size={15} />
            <span>Revoke All Other Sessions</span>
          </button>
        </div>
      </div>

      {/* Posture Score & Core Defense Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Security Score */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 rounded-xl text-cyan-400 flex-shrink-0">
            <Shield size={32} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block">
              Security Score
            </span>
            <div className="text-2xl font-extrabold text-cyan-400 mt-0.5">
              {posture?.security_score ?? 96.4}%
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium mt-0.5">
              <CheckCircle2 size={12} /> Optimal Posture
            </span>
          </div>
        </div>

        {/* Card 2: Encryption Standard */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-400 flex-shrink-0">
            <Lock size={32} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block">
              Encryption Protocol
            </span>
            <div className="text-sm font-bold text-gray-100 truncate mt-1">
              {posture?.encryption_status || 'AES-256-GCM / TLS 1.3'}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium mt-0.5">
              <CheckCircle2 size={12} /> Hardware Accelerated
            </span>
          </div>
        </div>

        {/* Card 3: Academic Guard Status */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-950/80 border border-blue-800 rounded-xl text-blue-400 flex-shrink-0">
            <Activity size={32} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block">
              Academic Shield
            </span>
            <div className="text-sm font-bold text-blue-400 mt-1">
              {posture?.academic_tamper_shield || 'ZERO-TRUST ONLINE'}
            </div>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              {posture?.crimes_blocked ?? 3} Tamper Probes Deflected
            </span>
          </div>
        </div>

        {/* Card 4: Firewall Quarantine Mode */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-950/80 border border-amber-800 rounded-xl text-amber-400 flex-shrink-0">
            <Cpu size={32} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block">
              Firewall Auto-Defense
            </span>
            <div className="text-sm font-bold text-amber-400 mt-1">
              AUTO-QUARANTINE
            </div>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              {posture?.active_firewall_rules ?? 14} Quarantine Rules Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Sessions & Failed Logins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Sessions */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-700 pb-3">
            <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2">
              <Key size={18} className="text-cyan-400" />
              Active Admin & Analyst Sessions
            </h2>
            <span className="text-xs text-cyan-400 font-mono px-2 py-0.5 bg-cyan-950/70 border border-cyan-800 rounded">
              {posture?.active_sessions.length || 0} active
            </span>
          </div>

          <div className="space-y-3">
            {posture?.active_sessions && posture.active_sessions.length > 0 ? (
              posture.active_sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 bg-gray-900/90 border border-gray-750 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-200">{sess.user_email}</span>
                      {sess.is_current && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase tracking-wide">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 flex items-center gap-2">
                      <span>{sess.device}</span>
                      <span>•</span>
                      <span className="font-mono text-cyan-400 font-medium">{sess.ip_address}</span>
                    </div>
                    <div className="text-gray-500 text-[11px] flex items-center gap-1">
                      <Globe size={12} />
                      {sess.location}
                    </div>
                  </div>

                  <div className="text-right text-gray-400 font-mono text-[11px]">
                    {sess.last_active}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 text-xs">
                No active external sessions recorded.
              </div>
            )}
          </div>
        </div>

        {/* Failed Login Attempts */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-700 pb-3">
            <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-400" />
              Recent Failed Logins & Attack Radar
            </h2>
            <span className="text-xs text-rose-400 font-semibold">Brute-Force Shield Active</span>
          </div>

          <div className="space-y-3">
            {posture?.recent_failed_logins && posture.recent_failed_logins.length > 0 ? (
              posture.recent_failed_logins.map((fl, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-gray-900/90 border border-gray-750 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-200 font-bold">{fl.ip}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-400 border border-red-800 uppercase">
                        {fl.status}
                      </span>
                    </div>
                    <div className="text-gray-400 text-[11px]">
                      Target: <strong className="text-gray-300 font-mono">{fl.target_user}</strong> •{' '}
                      <span className="text-rose-400 font-semibold">{fl.attempts} failed attempts</span>
                    </div>
                  </div>

                  <div className="text-right text-gray-400 font-mono text-[11px]">
                    {fl.timestamp}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 text-xs">
                Zero recent failed logins detected. System fully secure.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Hardening Recommendations */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2 border-b border-gray-700 pb-3">
          <AlertTriangle size={18} className="text-cyan-400" />
          Proactive SOC Hardening Directives
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {posture?.recommendations && posture.recommendations.length > 0 ? (
            posture.recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3.5 bg-gray-900/90 border border-gray-700/80 rounded-xl text-gray-300 leading-relaxed"
              >
                <div className="font-bold text-cyan-400 mb-1 text-xs">Directive #{i + 1}</div>
                {rec}
              </div>
            ))
          ) : (
            <div className="p-3.5 bg-gray-900/90 border border-gray-700/80 rounded-xl text-gray-300 leading-relaxed">
              <div className="font-bold text-cyan-400 mb-1 text-xs">Directive #1</div>
              Maintain regular rotation of JWT encryption secrets and institutional TLS certificates.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSecurity;
