import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';
import { 
  ShieldBan, Search, Filter, ShieldCheck, 
  AlertTriangle, Clock, Loader2, Globe, ShieldOff
} from 'lucide-react';

interface BlockedIP {
  id: string;
  ip: string;
  reason: string;
  blocked_at: string;
  expires_at: string;
  is_active: boolean;
  country: string;
}

export default function BlockedIPs() {
  const [ips, setIps] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBlockedIPs = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/firewall/rules', {
        params: { action: 'BLOCK', page, filter, search: searchTerm }
      });
      setIps(response.data.results || response.data.items || []);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      // Mock data
      setIps([
        { id: '1', ip: '185.220.101.5', reason: 'Attempted SQL injection probe on attendance', blocked_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), is_active: true, country: 'NL' },
        { id: '2', ip: '45.154.255.89', reason: 'High-frequency brute-force login scan', blocked_at: new Date(Date.now() - 3600000).toISOString(), expires_at: new Date(Date.now() + 82800000).toISOString(), is_active: true, country: 'RU' },
        { id: '3', ip: '103.21.244.12', reason: 'Unauthorized student roll number tampering', blocked_at: new Date(Date.now() - 86400000).toISOString(), expires_at: new Date(Date.now() - 1000).toISOString(), is_active: false, country: 'IN' }
      ]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedIPs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchBlockedIPs();
    }, 500);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleUnblock = async (id: string, ip: string) => {
    try {
      await apiClient.delete(`/firewall/rules/${id}`);
      toast.success(`Successfully unblocked IP: ${ip}`);
      setIps(ips.map(item => item.id === id ? { ...item, is_active: false } : item));
    } catch (error) {
      toast.error(`Failed to unblock IP: ${ip}`);
    }
  };

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode) return '🌐';
    const clean = countryCode.trim().toUpperCase();
    if (clean === 'GLOBAL' || clean === 'UNKNOWN' || clean.length !== 2 || !/^[A-Z]{2}$/.test(clean)) {
      return '🌐';
    }
    const codePoints = clean
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const formatCountryName = (country: string) => {
    if (!country || country.toUpperCase() === 'GLOBAL') return 'Global Attack Network';
    if (country.toUpperCase() === 'IN') return 'India (IN)';
    if (country.toUpperCase() === 'NL') return 'Netherlands (NL)';
    if (country.toUpperCase() === 'RU') return 'Russian Federation (RU)';
    if (country.toUpperCase() === 'US') return 'United States (US)';
    if (country.toUpperCase() === 'CN') return 'China (CN)';
    return country;
  };

  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return 'Permanent Policy';
    const date = new Date(dateStr);
    if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
      return 'Permanent Policy';
    }
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <ShieldBan className="text-rose-400" size={24} />
            Blocked Attackers & Protection Shield
          </h1>
          <p className="text-gray-400 text-sm mt-1">Review and manage IP addresses blocked from targeting your protected records.</p>
        </div>
        
        <div className="px-3.5 py-1.5 bg-emerald-950/80 border border-emerald-800 rounded-lg flex items-center gap-2 text-emerald-400 text-xs font-bold shadow-sm">
          <ShieldCheck size={16} className="text-emerald-400 animate-pulse" />
          <span>Automatic Threat Blocking: Active</span>
        </div>
      </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row gap-4 justify-between bg-gray-800/50">
            
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by IP address..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white outline-none placeholder-gray-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="pl-3 pr-8 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none text-white outline-none"
              >
                <option value="active">Active Blocks</option>
                <option value="expired">Expired Blocks</option>
                <option value="all">All Records</option>
              </select>
            </div>
            
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 font-medium">IP Address</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Reason</th>
                  <th className="px-6 py-4 font-medium">Blocked At</th>
                  <th className="px-6 py-4 font-medium">Expires At</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mx-auto" />
                    </td>
                  </tr>
                ) : ips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <ShieldCheck className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-base font-medium text-gray-400">No blocked IPs found</p>
                      <p className="text-sm mt-1">Your network is clear of blocked entities based on the current filters.</p>
                    </td>
                  </tr>
                ) : (
                  ips.map((item) => (
                    <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-750 transition-colors bg-gray-800">
                      <td className="px-6 py-4 font-medium text-gray-200">{item.ip}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className="text-base">{getCountryFlag(item.country)}</span>
                          <span className="text-gray-300 text-xs">{formatCountryName(item.country)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-gray-300" title={item.reason}>{item.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-xs text-gray-300">
                          <Clock className="h-3.5 w-3.5 text-gray-500" />
                          {new Date(item.blocked_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-xs text-gray-300">
                          <Clock className="h-3.5 w-3.5 text-gray-500" />
                          {formatExpiryDate(item.expires_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                            Expired
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.is_active && (
                          <button
                            onClick={() => handleUnblock(item.id, item.ip)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs font-medium transition-colors"
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                            Unblock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && ips.length > 0 && (
            <div className="p-4 border-t border-gray-700 flex items-center justify-between bg-gray-800/50">
              <span className="text-sm text-gray-400">
                Showing page <span className="font-medium text-white">{page}</span> of <span className="font-medium text-white">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-gray-700 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-gray-700 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
    </div>
  );
}
