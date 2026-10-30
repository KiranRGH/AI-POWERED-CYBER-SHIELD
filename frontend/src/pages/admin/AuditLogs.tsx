import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Search, Download, RefreshCw, Filter, 
  CheckCircle2, XCircle, Shield, Eye, Calendar, Terminal 
} from 'lucide-react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';

export interface AuditLogItem {
  id: number;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  result: string;
  ip_address: string;
  correlation_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/audit-logs', {
        params: {
          page,
          page_size: pageSize,
          search: search || undefined,
          action: actionFilter || undefined,
          result: resultFilter || undefined,
        },
      });
      setLogs(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to fetch system audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, resultFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleExportCSV = async () => {
    try {
      const res = await apiClient.get('/admin/audit-logs/export', {
        params: {
          search: search || undefined,
          action: actionFilter || undefined,
          result: resultFilter || undefined,
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cybershield-audit-logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Audit logs CSV downloaded successfully');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <ClipboardList className="text-cyan-400" size={28} />
            System Audit & Governance Logs
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Immutable SOC compliance log recording administrator actions, academic database access, and automated AI defense triggers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-cyan-950 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action, IP, target..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Filter size={16} />
            <span>Action:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Actions</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="FIREWALL_RULE_DEPLOYED">Firewall Rule Deployed</option>
            <option value="THREAT_INVESTIGATION_CLOSED">Threat Investigation</option>
            <option value="ATTENDANCE_RECORD_ACCESSED">Attendance Accessed</option>
            <option value="AI_MODEL_EVALUATED">AI Model Evaluated</option>
            <option value="UNAUTHORIZED_ACCESS_ATTEMPT">Unauthorized Attempt</option>
          </select>

          <select
            value={resultFilter}
            onChange={(e) => {
              setResultFilter(e.target.value);
              setPage(1);
            }}
            className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/60 text-gray-400 uppercase text-xs border-b border-gray-700 font-medium">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Target</th>
                <th className="px-5 py-3.5">Outcome</th>
                <th className="px-5 py-3.5">Source IP</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    No audit records matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-medium text-gray-200">
                      {log.actor_email}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs px-2 py-1 rounded bg-gray-900 border border-gray-700 text-cyan-400">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-300">
                      <span className="text-gray-400">{log.target_type}:</span>{' '}
                      <span className="font-mono text-cyan-300">{log.target_id}</span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {log.result === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 size={13} />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-950/80 text-red-400 border border-red-800">
                          <XCircle size={13} />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-gray-400">
                      {log.ip_address}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 hover:bg-gray-700 rounded text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="View Log Metadata"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
          <div>
            Showing <span className="text-gray-200">{logs.length}</span> of{' '}
            <span className="text-gray-200">{total}</span> total entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-300 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <Terminal className="text-cyan-400" size={20} />
                Audit Trail Telemetry Inspector
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-900 p-3 rounded border border-gray-700">
                <div>
                  <span className="text-gray-400">Log ID:</span>{' '}
                  <span className="font-mono text-cyan-400">#{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-gray-400">Correlation ID:</span>{' '}
                  <span className="font-mono text-cyan-400">{selectedLog.correlation_id}</span>
                </div>
                <div>
                  <span className="text-gray-400">Actor:</span>{' '}
                  <span className="text-gray-200">{selectedLog.actor_email}</span>
                </div>
                <div>
                  <span className="text-gray-400">Client IP:</span>{' '}
                  <span className="font-mono text-gray-200">{selectedLog.ip_address}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1">Target Resource:</span>
                <div className="bg-gray-900 p-2.5 rounded border border-gray-700 font-mono text-gray-200">
                  {selectedLog.target_type} &rarr; {selectedLog.target_id}
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1">Payload / Execution Metadata:</span>
                <pre className="bg-gray-950 p-3 rounded-lg border border-gray-800 font-mono text-xs text-cyan-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
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

export default AuditLogs;
