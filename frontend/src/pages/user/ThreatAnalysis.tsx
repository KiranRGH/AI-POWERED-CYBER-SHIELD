import React, { useEffect, useState, useCallback } from 'react';
import { Shield, AlertTriangle, Search, Filter, ExternalLink, ChevronDown, ChevronUp, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import apiClient from '../../api/axios';
import { formatDateTime, formatTimeAgo } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';

interface Threat {
  id: number;
  threat_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  source_ip: string;
  destination_ip?: string;
  confidence_score: number;
  status: string;
  description?: string;
  detected_at: string;
  country?: string;
  country_code?: string;
  protocol?: string;
  port?: number;
}

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-700', dot: 'bg-red-500 animate-pulse' },
  HIGH:     { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-700', dot: 'bg-orange-500' },
  MEDIUM:   { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700', dot: 'bg-yellow-500' },
  LOW:      { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-700', dot: 'bg-blue-500' },
  INFO:     { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-600', dot: 'bg-gray-500' },
};

const STATUS_COLOR: Record<string, string> = {
  AUTO_BLOCKED: 'text-emerald-400 font-semibold',
  AUTO_MITIGATED: 'text-emerald-400 font-semibold',
  BLOCKED: 'text-emerald-400 font-semibold',
  DETECTED: 'text-yellow-400',
  INVESTIGATING: 'text-cyan-400',
  MITIGATED: 'text-emerald-400',
  RESOLVED: 'text-gray-400',
  FALSE_POSITIVE: 'text-gray-500',
};

export default function ThreatAnalysis() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { page, pageSize, total, setTotal, goNext, goPrev, hasNext, hasPrev, totalPages } = usePagination({ initialPageSize: 15 });

  const fetchThreats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (debouncedSearch) params.search = debouncedSearch;
      if (severity) params.severity = severity;
      if (status) params.status = status;
      const response = await apiClient.get('/threats/my', { params });
      setThreats(response.data.items ?? response.data);
      setTotal(response.data.total ?? 0);
    } catch {
      setError('Failed to load threat data.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, severity, status]);

  useEffect(() => { fetchThreats(); }, [fetchThreats]);

  const severityBadge = (sev: string) => {
    const c = SEVERITY_CONFIG[sev] ?? SEVERITY_CONFIG.INFO;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {sev}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Shield className="text-cyan-400" size={24} />
              Security Events & Defense Log
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-800 shadow-sm">
              <Zap size={12} className="text-emerald-400 animate-pulse" />
              Automatic Threat Blocking Active
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">Autonomous AI defense logs. All intrusion vectors targeting your account are quarantined immediately.</p>
        </div>
        <button
          onClick={fetchThreats}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by IP, threat type..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
          />
        </div>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-3 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
        >
          <option value="">All Severities</option>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
        >
          <option value="">All Statuses</option>
          {['AUTO_BLOCKED', 'AUTO_MITIGATED', 'RESOLVED', 'DETECTED'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Threat List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-700">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 flex gap-4 animate-pulse">
                <div className="w-20 h-5 bg-gray-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-48" />
                  <div className="h-3 bg-gray-700 rounded w-64" />
                </div>
                <div className="w-24 h-4 bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <AlertTriangle size={40} className="text-red-400" />
            <p className="text-gray-400">{error}</p>
            <button onClick={fetchThreats} className="text-cyan-400 hover:text-cyan-300 text-sm">Retry</button>
          </div>
        ) : threats.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Shield size={40} className="text-gray-600" />
            <p className="text-gray-300 font-medium">No threats found</p>
            <p className="text-gray-500 text-sm">No threats match your current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {threats.map((threat) => {
              const cfg = SEVERITY_CONFIG[threat.severity] ?? SEVERITY_CONFIG.INFO;
              const isExpanded = expandedId === threat.id;
              return (
                <div key={threat.id} className="hover:bg-gray-750 transition-colors">
                  <button
                    className="w-full text-left p-4 flex items-start gap-4"
                    onClick={() => setExpandedId(isExpanded ? null : threat.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {threat.severity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-100 font-medium text-sm">{threat.threat_type.replace(/_/g, ' ')}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                          <ShieldCheck size={11} className="text-emerald-400" />
                          Auto-Blocked
                        </span>
                        <span className={`text-xs ${STATUS_COLOR[threat.status] ?? 'text-emerald-400'}`}>• {threat.status.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="text-gray-400 text-xs">Source: <span className="text-cyan-400 font-mono">{threat.source_ip}</span></span>
                        {threat.country && <span className="text-gray-400 text-xs">📍 {threat.country}</span>}
                        <span className="text-gray-400 text-xs">Confidence: <span className="text-green-400">{(threat.confidence_score * 100).toFixed(0)}%</span></span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-gray-500 text-xs hidden sm:block">{formatTimeAgo(threat.detected_at)}</span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 ml-4 border-l-2 border-gray-700 ml-20 space-y-2 text-sm">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div><span className="text-gray-500">Detected:</span> <span className="text-gray-300">{formatDateTime(threat.detected_at)}</span></div>
                        {threat.destination_ip && <div><span className="text-gray-500">Destination:</span> <span className="font-mono text-orange-400">{threat.destination_ip}</span></div>}
                        {threat.protocol && <div><span className="text-gray-500">Protocol:</span> <span className="text-gray-300">{threat.protocol}</span></div>}
                        {threat.port && <div><span className="text-gray-500">Port:</span> <span className="text-gray-300">{threat.port}</span></div>}
                        {threat.country_code && <div><span className="text-gray-500">Country:</span> <span className="text-gray-300">{threat.country} ({threat.country_code})</span></div>}
                      </div>
                      {threat.description && (
                        <div className="mt-2 p-3 bg-gray-900 rounded-lg">
                          <p className="text-gray-300 text-xs">{threat.description}</p>
                        </div>
                      )}
                      <p className="text-gray-600 text-xs italic">
                        ⚠️ IP geolocation is approximate only. Results may be affected by VPNs, proxies, or carrier NAT.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Showing {threats.length} of {total} threats</span>
          <div className="flex gap-2">
            <button onClick={goPrev} disabled={!hasPrev} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">Prev</button>
            <span className="px-3 py-1.5">Page {page} of {totalPages}</span>
            <button onClick={goNext} disabled={!hasNext} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
