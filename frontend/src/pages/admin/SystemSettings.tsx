import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, RefreshCw, Shield, AlertTriangle, 
  Lock, Mail, Cpu, CheckCircle2 
} from 'lucide-react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';

interface AppSettings {
  simulation_mode: boolean;
  auto_defense_enabled: boolean;
  max_login_attempts: number;
  account_lockout_minutes: number;
  otp_expire_minutes: number;
  otp_resend_cooldown_seconds: number;
  alert_email_enabled: boolean;
  alert_email_threshold: string;
}

export const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    simulation_mode: true,
    auto_defense_enabled: true,
    max_login_attempts: 5,
    account_lockout_minutes: 15,
    otp_expire_minutes: 10,
    otp_resend_cooldown_seconds: 60,
    alert_email_enabled: false,
    alert_email_threshold: 'CRITICAL',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const cached = localStorage.getItem('admin_system_settings');
      if (cached) {
        setSettings(prev => ({ ...prev, ...JSON.parse(cached) }));
      }
    } catch {}

    setLoading(true);
    try {
      const res = await apiClient.get('/admin/settings');
      if (res.data) {
        setSettings(res.data);
      }
    } catch {
      // Keep cached
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...settings, auto_defense_enabled: true };
      localStorage.setItem('admin_system_settings', JSON.stringify(payload));
      const res = await apiClient.patch('/admin/settings', payload);
      if (res.data) {
        setSettings({ ...res.data, auto_defense_enabled: true });
      }
      toast.success('System configuration parameters saved successfully');
    } catch {
      toast.success('Configuration saved locally');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Settings className="text-cyan-400" size={28} />
            System Global Configuration
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Configure autonomous defense behavior, rate limits, OTP lifetimes, and academic threat simulation mode.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Defense & Simulation Switches */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2 border-b border-gray-700 pb-3">
            <Shield size={18} className="text-cyan-400" />
            Autonomous Defense & Simulation Controls
          </h2>

          <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
            <div>
              <span className="font-semibold text-gray-100 text-sm block">
                Simulation & Testbed Mode
              </span>
              <span className="text-xs text-gray-400">
                Allows testing tampering attacks against student roll numbers (e.g. 1CK21CS045) and safe emulation of firewall actions.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.simulation_mode}
                onChange={(e) => setSettings({ ...settings, simulation_mode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-300 text-sm">
                  Threat Defense Mode
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900 text-emerald-200 border border-emerald-700">
                  AUTOMATIC BLOCKING (LOCKED)
                </span>
              </div>
              <span className="text-xs text-gray-300 mt-1 block max-w-xl">
                Autonomous defense engine actively detects and instantly auto-blocks malicious IPs, student roll number tampering probes, and SQL injections without requiring manual review.
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/60 border border-emerald-700 text-emerald-300 font-semibold text-xs rounded-lg shadow-sm flex-shrink-0">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Section 2: Security & Authentication Parameters */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2 border-b border-gray-700 pb-3">
            <Lock size={18} className="text-cyan-400" />
            Authentication & Lockout Limits
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-gray-300 font-medium block mb-1">
                Max Login Attempts Before Lockout
              </label>
              <input
                type="number"
                min="3"
                max="20"
                value={settings.max_login_attempts}
                onChange={(e) => setSettings({ ...settings, max_login_attempts: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1">
                Account Lockout Duration (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.account_lockout_minutes}
                onChange={(e) => setSettings({ ...settings, account_lockout_minutes: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1">
                OTP Expiration Window (Minutes)
              </label>
              <input
                type="number"
                min="2"
                max="30"
                value={settings.otp_expire_minutes}
                onChange={(e) => setSettings({ ...settings, otp_expire_minutes: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1">
                OTP Resend Cooldown (Seconds)
              </label>
              <input
                type="number"
                min="15"
                max="300"
                value={settings.otp_resend_cooldown_seconds}
                onChange={(e) => setSettings({ ...settings, otp_resend_cooldown_seconds: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Notification & Alert Thresholds */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2 border-b border-gray-700 pb-3">
            <Mail size={18} className="text-cyan-400" />
            Automated Alert Dispatch
          </h2>

          <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
            <div>
              <span className="font-semibold text-gray-100 text-sm block">
                Dispatch Security Alert Emails
              </span>
              <span className="text-xs text-gray-400">
                Send real-time alerts to registered administrative contacts when attacks breach severity threshold.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.alert_email_enabled}
                onChange={(e) => setSettings({ ...settings, alert_email_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          <div className="text-xs">
            <label className="text-gray-300 font-medium block mb-1">
              Minimum Alert Severity Threshold for Dispatch
            </label>
            <select
              value={settings.alert_email_threshold}
              onChange={(e) => setSettings({ ...settings, alert_email_threshold: e.target.value })}
              className="w-full md:w-64 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="CRITICAL">CRITICAL Only (USN database tamper, SQLi)</option>
              <option value="HIGH">HIGH and Above</option>
              <option value="MEDIUM">MEDIUM and Above</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-cyan-950 transition-colors"
          >
            <Save size={16} className={saving ? 'animate-spin' : ''} />
            {saving ? 'Saving Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemSettings;
