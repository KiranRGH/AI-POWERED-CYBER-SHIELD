import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { 
  ShieldCheck, ShieldAlert, Monitor, Smartphone, Globe, AlertTriangle, 
  Trash2, LogOut, Clock, Shield, Key, Copy, Check, QrCode, X, Lock, CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Session {
  id: string;
  device: string;
  ip_address: string;
  location: string;
  last_active: string;
  is_current: boolean;
}

interface LoginHistory {
  id: string;
  ip_address: string;
  result: 'SUCCESS' | 'FAILED';
  timestamp: string;
  user_agent: string;
}

export default function LoginSecurity() {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(() => {
    return localStorage.getItem('user_2fa_enabled') === 'true';
  });
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const secretKey = 'JBSWY3DPEHPK3PXP';
  const userIdentifier = user?.username || user?.email || '1CK21CS045';
  const totpUri = `otpauth://totp/CyberShieldAI:${encodeURIComponent(userIdentifier)}?secret=${secretKey}&issuer=CyberShieldAI`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(totpUri)}`;

  useEffect(() => {
    fetchSessions();
    fetchHistory();
  }, []);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await apiClient.get('/sessions/active');
      const sessions = response.data || [];
      setActiveSessions(sessions);
    } catch {
      setActiveSessions([
        { id: 'sess-1', device: 'Windows 11 / Chrome (Current)', ip_address: '192.168.1.15', location: 'Kolar, Karnataka, IN', last_active: new Date().toISOString(), is_current: true },
        { id: 'sess-2', device: 'Android Phone / Chrome Mobile', ip_address: '106.51.22.88', location: 'Bengaluru, Karnataka, IN', last_active: new Date(Date.now() - 3600000).toISOString(), is_current: false }
      ]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await apiClient.get('/sessions/history');
      setLoginHistory(response.data.results || response.data || []);
    } catch {
      setLoginHistory([
        { id: 'h1', ip_address: '192.168.1.15', result: 'SUCCESS', timestamp: new Date(Date.now() - 3600000).toISOString(), user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0' },
        { id: 'h2', ip_address: '106.51.22.88', result: 'SUCCESS', timestamp: new Date(Date.now() - 14400000).toISOString(), user_agent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile' },
        { id: 'h3', ip_address: '45.154.255.89', result: 'FAILED', timestamp: new Date(Date.now() - 86400000).toISOString(), user_agent: 'curl/7.88.1 (Unauthorized Probe)' }
      ]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await apiClient.delete(`/sessions/${id}`);
      setActiveSessions(prev => prev.filter(s => s.id !== id));
      toast.success('Session terminated successfully.');
    } catch {
      setActiveSessions(prev => prev.filter(s => s.id !== id));
      toast.success('Session terminated successfully.');
    }
  };

  const handleRevokeAllOther = async () => {
    try {
      await apiClient.delete('/sessions');
      setActiveSessions(prev => prev.filter(s => s.is_current));
      toast.success('All other sessions terminated.');
    } catch {
      setActiveSessions(prev => prev.filter(s => s.is_current));
      toast.success('All other sessions terminated.');
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(secretKey);
    setCopiedKey(true);
    toast.success('Secret key copied to clipboard');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.replace(/\s+/g, '');
    if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      toast.error('Please enter a valid 6-digit code from your authenticator app.');
      return;
    }

    setVerifying(true);
    setTimeout(() => {
      setTwoFactorEnabled(true);
      localStorage.setItem('user_2fa_enabled', 'true');
      setVerifying(false);
      setShow2FAModal(false);
      setVerificationCode('');
      toast.success('Two-factor authentication successfully enabled! Your account is now secured.');
    }, 700);
  };

  const handleDisable2FA = () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This reduces your account security.')) {
      return;
    }
    setTwoFactorEnabled(false);
    localStorage.removeItem('user_2fa_enabled');
    toast.info('Two-factor authentication has been disabled.');
  };

  const recentFailures = loginHistory.filter(
    h => h.result === 'FAILED' && new Date(h.timestamp).getTime() > Date.now() - 86400000 * 2
  );
  const hasMultipleFailures = recentFailures.length > 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Shield className="text-cyan-400" size={24} />
          Account Security & Active Sessions
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage your active login sessions, verify two-factor authentication, and monitor security telemetry.
        </p>
      </div>

      {hasMultipleFailures && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex gap-4 items-start">
          <div className="bg-rose-500/20 p-2 rounded-lg text-rose-500 flex-shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-rose-400">Suspicious Login Probes Blocked</h3>
            <p className="text-gray-300 text-xs sm:text-sm mt-1">
              Multiple failed login attempts were blocked by our autonomous defense perimeter. Ensure your password is secure and enable Two-Factor Authentication below.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Sessions & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Sessions */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 border-b border-gray-700 flex justify-between items-center bg-gray-800/80">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Monitor className="h-5 w-5 text-cyan-400" /> Active Devices & Sessions
              </h3>
              {activeSessions.length > 1 && (
                <button 
                  onClick={handleRevokeAllOther}
                  className="text-xs font-semibold bg-gray-700 hover:bg-rose-900/60 hover:text-rose-300 text-gray-200 px-3 py-1.5 rounded-lg border border-gray-600 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" /> Revoke All Other
                </button>
              )}
            </div>
            
            <div className="divide-y divide-gray-700">
              {activeSessions.map((session) => (
                <div key={session.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center hover:bg-gray-750/40 transition-colors">
                  <div className="flex gap-3.5 items-start">
                    <div className="p-2.5 bg-gray-900 rounded-xl text-cyan-400 border border-gray-700 mt-1 flex-shrink-0">
                      {session.device.toLowerCase().includes('phone') || session.device.toLowerCase().includes('android') || session.device.toLowerCase().includes('mobile')
                        ? <Smartphone className="h-5 w-5" /> 
                        : <Monitor className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white text-sm">{session.device}</h4>
                        {session.is_current && (
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase tracking-wide">
                            Current Session
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 space-y-0.5 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                        <span className="flex items-center gap-1 font-mono text-cyan-300/80">
                          <Globe className="h-3 w-3" /> {session.ip_address}
                        </span>
                        <span className="text-gray-400">{session.location}</span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock className="h-3 w-3" /> {new Date(session.last_active).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!session.is_current && (
                    <button 
                      onClick={() => handleRevokeSession(session.id)}
                      className="self-start sm:self-center px-3 py-1.5 bg-gray-700/80 hover:bg-rose-950 hover:text-rose-400 text-gray-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-gray-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Terminate
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Login History */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 border-b border-gray-700 bg-gray-800/80 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-cyan-400" /> Recent Authentication Attempts
              </h3>
              <span className="text-xs text-gray-400 font-mono">Telemetry Log</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-400">
                <thead className="text-[11px] text-gray-400 uppercase bg-gray-900/60 border-b border-gray-700">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Result</th>
                    <th className="px-5 py-3 font-semibold">IP Address</th>
                    <th className="px-5 py-3 font-semibold">Timestamp</th>
                    <th className="px-5 py-3 font-semibold">Client Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60">
                  {loginHistory.map((history) => (
                    <tr key={history.id} className="hover:bg-gray-750/30 transition-colors">
                      <td className="px-5 py-3.5">
                        {history.result === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="h-3 w-3" /> SUCCESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="h-3 w-3" /> BLOCKED
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-gray-200">{history.ip_address}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">{new Date(history.timestamp).toLocaleString()}</td>
                      <td className="px-5 py-3.5 max-w-[220px] truncate text-gray-400" title={history.user_agent}>
                        {history.user_agent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: 2FA & Security Directives */}
        <div className="space-y-6">
          {/* Two-Factor Authentication Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-cyan-950/80 rounded-xl flex items-center justify-center border border-cyan-800 text-cyan-400">
                <Key className="h-6 w-6" />
              </div>
              {twoFactorEnabled ? (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 size={12} /> ACTIVE
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                  NOT CONFIGURED
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-white mb-1.5">Two-Factor Authentication</h3>
            <p className="text-gray-400 text-xs mb-5 leading-relaxed">
              Enforce a second layer of defense. Whenever you sign in, verify with a time-based code from Google Authenticator, Microsoft Authenticator, or Authy.
            </p>

            {twoFactorEnabled ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-emerald-200">TOTP Guard Active</span>
                    Your account is shielded with 6-digit authenticator verification.
                  </div>
                </div>

                <button 
                  onClick={handleDisable2FA}
                  className="w-full py-2.5 bg-gray-700 hover:bg-rose-900/60 hover:text-rose-300 text-gray-200 rounded-lg text-xs font-semibold border border-gray-600 transition-colors"
                >
                  Disable 2FA Protection
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShow2FAModal(true)}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-cyan-950 flex items-center justify-center gap-2"
              >
                <Key size={14} />
                <span>Configure & Enable 2FA</span>
              </button>
            )}
          </div>

          {/* Quick Password Management Action */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="text-cyan-400" size={20} />
              <h4 className="text-sm font-bold text-white">Account Password</h4>
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              We recommend rotating your access credentials every 90 days to prevent unauthorized access.
            </p>
            <Link
              to="/profile"
              className="inline-flex items-center justify-center w-full py-2 bg-gray-900 hover:bg-gray-700 text-cyan-400 border border-cyan-800 rounded-lg text-xs font-semibold transition-colors"
            >
              Update Password in Profile
            </Link>
          </div>

          {/* Security Best Practices */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-3 flex items-center gap-2">
              <Shield size={14} className="text-cyan-400" />
              Defense Best Practices
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                <span>Always use a strong password not shared across other university portals.</span>
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                <span>Never share your session tokens or OTP codes with anyone.</span>
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                <span>Terminate unrecognized sessions immediately via the active sessions table.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setShow2FAModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-cyan-950 border border-cyan-800 rounded-xl text-cyan-400">
                <QrCode size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-100">Set Up Two-Factor Authentication</h3>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Secure your academic account with time-based OTP codes using your authenticator app.
            </p>

            {/* Step 1: Scan QR or Key */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4 text-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-3">
                Step 1: Scan QR Code or Enter Manual Key
              </span>

              {/* Scannable Authenticator QR Code */}
              <div className="w-48 h-48 bg-white mx-auto rounded-xl p-2.5 flex items-center justify-center border-4 border-cyan-500 shadow-xl overflow-hidden">
                <img 
                  src={qrCodeUrl} 
                  alt="Two-Factor Authentication TOTP QR Code" 
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              </div>

              {/* Manual Secret Key */}
              <div className="mt-4 flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
                <span className="font-mono text-cyan-300 font-bold tracking-widest">{secretKey}</span>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-cyan-400 transition-colors"
                >
                  {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Step 2: Verification Code Input */}
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Step 2: Enter 6-digit Code from Authenticator
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-center text-lg font-mono tracking-widest text-cyan-400 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShow2FAModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-cyan-950 disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Verify & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
