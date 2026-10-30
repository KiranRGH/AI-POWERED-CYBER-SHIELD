import React, { useState, useEffect } from 'react';
import { 
  Bell, Plus, ShieldAlert, CheckCircle2, AlertOctagon, 
  Trash2, Power, Filter, Clock, Send, Shield
} from 'lucide-react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';

interface AlertRule {
  id: number;
  name: string;
  description: string;
  condition_type: string;
  threshold: number;
  severity: string;
  is_active: boolean;
  notification_channels: string[];
  cooldown_minutes: number;
  created_at: string;
}

interface TriggeredAlert {
  id: number;
  title: string;
  message: string;
  severity: string;
  source: string;
  status: string;
  created_at: string;
}

export const AlertManagement: React.FC = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [stats, setStats] = useState<any>({
    total_rules: 0,
    active_rules: 0,
    triggered_today: 0,
    auto_resolved: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleCondition, setRuleCondition] = useState('CRIME_DATASET_TAMPER');
  const [ruleThreshold, setRuleThreshold] = useState(85);
  const [ruleSeverity, setRuleSeverity] = useState('CRITICAL');
  const [ruleChannels, setRuleChannels] = useState<string[]>(['DASHBOARD', 'EMAIL']);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/alerts');
      setRules(res.data.rules || []);
      setTriggeredAlerts(res.data.active_alerts || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch {
      toast.error('Failed to load alert policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleToggleRule = async (ruleId: number, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/admin/alerts/${ruleId}`, {
        is_active: !currentStatus,
      });
      toast.success(`Alert rule ${!currentStatus ? 'enabled' : 'disabled'}`);
      fetchAlerts();
    } catch {
      toast.error('Failed to update rule status');
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!window.confirm('Are you sure you want to delete this alert rule?')) return;
    try {
      await apiClient.delete(`/admin/alerts/${ruleId}`);
      toast.success('Alert rule deleted');
      fetchAlerts();
    } catch {
      toast.error('Failed to delete alert rule');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName) {
      toast.error('Please enter a rule name');
      return;
    }
    try {
      await apiClient.post('/admin/alerts', {
        name: ruleName,
        description: ruleDesc,
        condition_type: ruleCondition,
        threshold: ruleThreshold,
        severity: ruleSeverity,
        notification_channels: ruleChannels,
        cooldown_minutes: 30,
      });
      toast.success('New alert rule established successfully');
      setShowCreateModal(false);
      setRuleName('');
      setRuleDesc('');
      fetchAlerts();
    } catch {
      toast.error('Failed to create alert rule');
    }
  };

  const toggleChannel = (ch: string) => {
    if (ruleChannels.includes(ch)) {
      setRuleChannels(ruleChannels.filter((c) => c !== ch));
    } else {
      setRuleChannels([...ruleChannels, ch]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Bell className="text-cyan-400" size={28} />
            Alert Policies & Notification Triggers
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Configure automated escalation thresholds, SIEM triggers, and email notifications for academic database attacks.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-cyan-950 transition-colors"
        >
          <Plus size={16} />
          Create Alert Rule
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <span className="text-gray-400 text-xs block">Configured Rules</span>
          <span className="text-2xl font-bold text-gray-100 mt-1 block">{stats.total_rules}</span>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <span className="text-gray-400 text-xs block">Active Triggers</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">{stats.active_rules}</span>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <span className="text-gray-400 text-xs block">Incidents Today</span>
          <span className="text-2xl font-bold text-amber-400 mt-1 block">{stats.triggered_today}</span>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <span className="text-gray-400 text-xs block">Auto-Mitigated</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1 block">{stats.auto_resolved}</span>
        </div>
      </div>

      {/* Triggered Live Alerts */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2">
          <AlertOctagon size={18} className="text-red-400" />
          Active Incident Alerts (Last 24 Hours)
        </h2>
        <div className="space-y-2">
          {triggeredAlerts.map((alt) => (
            <div
              key={alt.id}
              className="p-3.5 bg-gray-900 border border-gray-700 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      alt.severity === 'CRITICAL'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {alt.severity}
                  </span>
                  <h4 className="font-semibold text-gray-200 text-sm">{alt.title}</h4>
                </div>
                <p className="text-xs text-gray-400 mt-1">{alt.message}</p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-400">
                  Source: <strong className="text-cyan-400">{alt.source}</strong>
                </span>
                <span className="px-2.5 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 font-mono">
                  {alt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide">
            Defined Escalation & Threshold Policies
          </h2>
          <span className="text-xs text-gray-400">{rules.length} total policies</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/60 text-gray-400 uppercase text-xs border-b border-gray-700 font-medium">
              <tr>
                <th className="px-5 py-3.5">Policy Name & Description</th>
                <th className="px-5 py-3.5">Condition</th>
                <th className="px-5 py-3.5">Threshold</th>
                <th className="px-5 py-3.5">Severity</th>
                <th className="px-5 py-3.5">Channels</th>
                <th className="px-5 py-3.5">State</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-gray-100">{rule.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{rule.description}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-cyan-400">
                    {rule.condition_type}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-200">
                    &ge; {rule.threshold}%
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        rule.severity === 'CRITICAL'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : rule.severity === 'HIGH'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {rule.notification_channels.map((ch, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-900 border border-gray-700 text-gray-400 rounded text-[10px]"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        rule.is_active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-gray-900 text-gray-500 border border-gray-700'
                      }`}
                    >
                      <Power size={12} />
                      {rule.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                      title="Delete Policy"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <Plus className="text-cyan-400" size={20} />
                Create Escalation Alert Policy
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-300 font-medium block mb-1">Policy Title</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Excessive Attendance Modification Alarm"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">Description</label>
                <textarea
                  value={ruleDesc}
                  onChange={(e) => setRuleDesc(e.target.value)}
                  placeholder="Detail the operational threat criteria..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500 h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-medium block mb-1">Condition Trigger</label>
                  <select
                    value={ruleCondition}
                    onChange={(e) => setRuleCondition(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CRIME_DATASET_TAMPER">Academic Tamper Detection</option>
                    <option value="SQL_INJECTION">SQL Injection Attempt</option>
                    <option value="FAILED_LOGINS">Failed Login Threshold</option>
                    <option value="TOR_EXIT_DETECTED">Tor / Malicious Proxy</option>
                    <option value="MODEL_ACCURACY">AI Model Accuracy Drop</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 font-medium block mb-1">Severity Level</label>
                  <select
                    value={ruleSeverity}
                    onChange={(e) => setRuleSeverity(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">
                  Confidence Threshold: <span className="text-cyan-400 font-bold">{ruleThreshold}%</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={ruleThreshold}
                  onChange={(e) => setRuleThreshold(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1.5">Notification Channels</label>
                <div className="flex flex-wrap gap-2">
                  {['DASHBOARD', 'EMAIL', 'TELEGRAM', 'FIREWALL_AUTO_BLOCK'].map((ch) => (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => toggleChannel(ch)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        ruleChannels.includes(ch)
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-950"
                >
                  Deploy Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertManagement;
