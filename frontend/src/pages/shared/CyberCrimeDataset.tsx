import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Download, Filter, Search, RefreshCw, 
  Terminal, ShieldCheck, Database, Ban, AlertOctagon, CheckCircle2, User
} from 'lucide-react';
import { studentsAttendanceApi, CyberCrimeIncident } from '../../api/studentsAttendance';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';

export const CyberCrimeDataset = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'SUPERADMIN' || user?.role?.toUpperCase() === 'ADMIN';
  const userIdentifier = user?.username?.trim() || user?.email?.trim() || '';

  const [crimes, setCrimes] = useState<CyberCrimeIncident[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<CyberCrimeIncident | null>(null);
  const [filterAttack, setFilterAttack] = useState('');
  const [searchTarget, setSearchTarget] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const targetParam = isAdmin 
        ? (searchTarget || undefined) 
        : (userIdentifier || undefined);

      const [listData, statsData] = await Promise.all([
        studentsAttendanceApi.getCyberCrimes({
          attack_type: filterAttack || undefined,
          target_identifier: targetParam,
        }),
        studentsAttendanceApi.getCyberCrimeStats(),
      ]);

      let filteredList = listData;
      if (!isAdmin && userIdentifier) {
        filteredList = listData.filter(c => 
          c.target_identifier.toUpperCase().includes(userIdentifier.toUpperCase()) ||
          (user?.email && c.target_identifier.toLowerCase().includes(user.email.toLowerCase()))
        );
      }

      setCrimes(filteredList);
      setStats(statsData);
    } catch {
      toast.error('Failed to load threat records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterAttack]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={28} />
            Threat Records & Academic Tamper Telemetry
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isAdmin 
              ? "Comprehensive forensic telemetry of unauthorized modifications, deletions, and SQL injections targeting institutional academic databases."
              : `Forensic security telemetry and threat records targeting your account (${userIdentifier || 'User'}).`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <a
              href={studentsAttendanceApi.getExportCsvUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-red-900/20"
            >
              <Download size={16} />
              <span>Export Dataset (CSV)</span>
            </a>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Total Tampering Intercepted</p>
              <h3 className="text-2xl font-bold text-gray-100 mt-1">
                {stats.total_tampering_attempts ?? 0}
              </h3>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
              <AlertOctagon size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Captured in security audit logs</p>
        </div>

        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Auto-Defense Success Rate</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                {stats.defense_success_rate ?? '100%'}
              </h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-2">Zero unauthorized changes permitted</p>
        </div>

        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Unauthorized Modifications</p>
              <h3 className="text-2xl font-bold text-orange-400 mt-1">
                {stats.unauthorized_modifications ?? 0}
              </h3>
            </div>
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
              <Database size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Attendance forgery attempts</p>
        </div>

        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Quarantined Malicious IPs</p>
              <h3 className="text-2xl font-bold text-purple-400 mt-1">
                {stats.active_quarantined_ips ?? 0}
              </h3>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Ban size={20} />
            </div>
          </div>
          <p className="text-[11px] text-purple-400/80 mt-2">Enforced by dynamic firewall</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col md:flex-row gap-3">
        {isAdmin ? (
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              placeholder="Search by Target Identifier e.g. 1CK21CS045..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300">
            <User size={15} className="text-cyan-400" />
            <span>Target Filter: <strong className="text-cyan-300 font-mono">{userIdentifier || 'Current User'}</strong> (Own account records only)</span>
          </div>
        )}

        <div className="flex gap-2">
          <select
            value={filterAttack}
            onChange={(e) => setFilterAttack(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Attack Types</option>
            <option value="UNAUTHORIZED_MODIFICATION">Unauthorized Modification</option>
            <option value="UNAUTHORIZED_DELETION">Unauthorized Deletion</option>
            <option value="SQL_INJECTION">SQL Injection</option>
            <option value="THIRD_PARTY_TAMPERING">Third-Party Tampering</option>
          </select>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Crime Incidents Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/60 text-gray-400 border-b border-gray-700 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Target Record (USN)</th>
                <th className="py-3 px-4">Attack Vector</th>
                <th className="py-3 px-4">Source IP</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Auto-Defense Status</th>
                <th className="py-3 px-4 text-right">Forensic Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60">
              {crimes.length > 0 ? (
                crimes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{c.incident_id}</td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(c.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-gray-200">
                      {c.target_identifier}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-200">
                        {c.attack_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-red-400">{c.source_ip}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.severity === 'CRITICAL'
                            ? 'bg-red-900/60 text-red-300 border border-red-700'
                            : 'bg-orange-900/60 text-orange-300 border border-orange-700'
                        }`}
                      >
                        {c.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <ShieldCheck size={14} />
                        {c.defense_action_taken.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedIncident(c)}
                        className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <ShieldCheck size={36} className="text-emerald-500/50 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-300">No threat or tampering records recorded</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isAdmin 
                        ? 'No threat records match your filter criteria.'
                        : `No attack tampering detected targeting your account (${userIdentifier || 'User'}). Zero-trust defense active.`}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Payload Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-700">
              <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                <Terminal size={20} />
                Forensic Payload Telemetry ({selectedIncident.incident_id})
              </h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-gray-400 hover:text-gray-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-900/80 p-3 rounded-lg border border-gray-700">
                <div>
                  <span className="text-gray-400">Target Resource:</span>
                  <p className="font-mono font-bold text-cyan-400 mt-0.5">{selectedIncident.target_identifier}</p>
                </div>
                <div>
                  <span className="text-gray-400">Attack Type:</span>
                  <p className="font-semibold text-gray-200 mt-0.5">{selectedIncident.attack_type}</p>
                </div>
                <div>
                  <span className="text-gray-400">Attacker IP:</span>
                  <p className="font-mono text-red-400 mt-0.5">{selectedIncident.source_ip}</p>
                </div>
                <div>
                  <span className="text-gray-400">Location / Proxy:</span>
                  <p className="text-gray-300 mt-0.5">{selectedIncident.source_location}</p>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1 font-semibold">Intercepted Malicious Payload / SQL:</span>
                <div className="bg-black/90 text-green-400 font-mono p-3 rounded-lg border border-gray-800 text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {selectedIncident.payload_details}
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1 font-semibold">Client User-Agent:</span>
                <div className="bg-gray-900 text-gray-300 font-mono p-2 rounded border border-gray-700 text-[11px]">
                  {selectedIncident.user_agent}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CyberCrimeDataset;
