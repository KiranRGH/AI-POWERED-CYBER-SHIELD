import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Search, CheckCircle2, XCircle, Clock, 
  RefreshCw, ShieldCheck, UserCheck, Filter, Users, ShieldAlert,
  GraduationCap, Shield
} from 'lucide-react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

interface PendingRegItem {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role?: string;
  category?: 'FACULTY' | 'STUDENT' | 'PENDING' | string;
  is_faculty?: boolean;
  created_at: string;
  expires_at?: string | null;
  status: 'PENDING_APPROVAL' | 'APPROVED' | string;
}

export const RegisteredUsers: React.FC = () => {
  const { user: authUser } = useAuth();
  const currentRole = (authUser?.role || 'USER').toUpperCase();
  const isSuperAdmin = currentRole === 'SUPERADMIN';
  const isAdmin = currentRole === 'ADMIN';

  const [registrations, setRegistrations] = useState<PendingRegItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [facultyCount, setFacultyCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FACULTY' | 'STUDENT' | 'PENDING' | 'APPROVED'>('ALL');
  const [selectedReg, setSelectedReg] = useState<PendingRegItem | null>(null);
  const [assignRole, setAssignRole] = useState('USER');
  const [showApproveModal, setShowApproveModal] = useState(false);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/registrations', {
        params: { 
          search: search || undefined,
          status_filter: statusFilter
        },
      });
      setRegistrations(res.data.items || []);
      setTotal(res.data.total || 0);
      setPendingCount(res.data.pending_count ?? 0);
      setApprovedCount(res.data.approved_count ?? 0);
      setFacultyCount(res.data.faculty_count ?? 0);
      setStudentCount(res.data.student_count ?? 0);
    } catch {
      toast.error('Failed to load registered accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRegistrations();
  };

  const handleApprove = async () => {
    if (!selectedReg) return;
    try {
      await apiClient.post(`/admin/registrations/${selectedReg.id}/approve`, null, {
        params: { role: assignRole },
      });
      toast.success(`Account clearance approved for ${selectedReg.full_name} (${assignRole})`);

      // Immediately mark as approved locally so it never shows pending
      setRegistrations(prev => prev.map(item => {
        if (item.id === selectedReg.id) {
          return { ...item, status: 'APPROVED', role: assignRole };
        }
        return item;
      }));
      setPendingCount(prev => Math.max(0, prev - 1));
      setApprovedCount(prev => prev + 1);

      setShowApproveModal(false);
      setSelectedReg(null);
      fetchRegistrations();
    } catch {
      toast.error('Failed to approve registration clearance');
    }
  };

  const handleReject = async (id: number, username: string) => {
    if (!window.confirm(`Reject registration clearance request for ${username}?`)) return;
    try {
      await apiClient.post(`/admin/registrations/${id}/reject`);
      toast.info(`Registration for ${username} rejected`);
      fetchRegistrations();
    } catch {
      toast.error('Failed to reject registration');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <UserPlus className="text-cyan-400" size={28} />
            Institutional User Registrations & Clearance
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Review, verify, and grant clearance to student VTU USNs, university faculty, and SOC analysts.
          </p>
        </div>
        <button
          onClick={fetchRegistrations}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-sm transition-colors shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Records
        </button>
      </div>

      {/* Filter / Status Tabs Bar */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Status Tabs */}
          <div className="flex items-center bg-gray-900 p-1 rounded-xl border border-gray-700 text-xs flex-wrap gap-1">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-cyan-500 text-gray-950 font-bold shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Users size={14} />
              <span>All Registrations ({total})</span>
            </button>
            <button
              onClick={() => setStatusFilter('FACULTY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'FACULTY'
                  ? 'bg-purple-500 text-white font-bold shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Shield size={14} />
              <span>Faculty & Staff ({facultyCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('STUDENT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'STUDENT'
                  ? 'bg-emerald-500 text-gray-950 font-bold shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <GraduationCap size={14} />
              <span>Students & Users ({studentCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-gray-950 font-bold shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Clock size={14} />
              <span>Pending Clearance ({pendingCount})</span>
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="relative w-full lg:w-80">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by USN, name, email..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </form>
        </div>

        {/* Security Banner Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400 pt-2 border-t border-gray-700/60">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-amber-400" />
              <strong className="text-gray-200">{pendingCount}</strong> Pending Verification
            </span>
            <span className="text-gray-600">|</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <strong className="text-gray-200">{approvedCount}</strong> Cleared Accounts
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px]">
            <ShieldCheck size={14} className="text-cyan-400" />
            Role-Based Access Control (RBAC) Enforced
          </span>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/60 text-gray-400 uppercase text-xs border-b border-gray-700 font-medium">
              <tr>
                <th className="px-5 py-3.5">Candidate / User</th>
                <th className="px-5 py-3.5">Roll Number / USN</th>
                <th className="px-5 py-3.5">Institutional Email</th>
                <th className="px-5 py-3.5">Registered Date</th>
                <th className="px-5 py-3.5">Clearance Status</th>
                <th className="px-5 py-3.5 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading registration records...</span>
                    </div>
                  </td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No accounts found matching the selected filter.
                  </td>
                </tr>
              ) : (
                registrations.map((reg) => {
                  const isApproved = reg.status === 'APPROVED';
                  const isFaculty = reg.is_faculty || ['ADMIN', 'SUPERADMIN', 'ANALYST'].includes(reg.role?.toUpperCase() || '');
                  return (
                    <tr key={`${reg.status}-${reg.id}`} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-gray-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{reg.full_name}</span>
                          {isFaculty ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-800 flex items-center gap-1">
                              <Shield size={10} /> Faculty ({reg.role})
                            </span>
                          ) : isApproved ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                              <GraduationCap size={10} /> Student (USER)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
                              <Clock size={10} /> Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-cyan-300 font-bold">
                        {reg.username}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-300 font-mono">
                        {reg.email}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {new Date(reg.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800 shadow-sm">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            Approved (Active)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800 animate-pulse">
                            <Clock size={13} className="text-amber-400" />
                            Awaiting Clearance
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isApproved ? (
                          <div className="flex items-center justify-end gap-1.5 text-xs text-emerald-400 font-semibold">
                            <ShieldCheck size={16} />
                            <span>Cleared</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedReg(reg);
                                setAssignRole('USER');
                                setShowApproveModal(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-medium transition-colors shadow-sm"
                            >
                              <UserCheck size={14} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(reg.id, reg.username)}
                              className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-red-700 hover:text-white text-gray-300 rounded text-xs transition-colors"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {showApproveModal && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <UserCheck className="text-emerald-400" size={20} />
                Grant Clearance & Activate Account
              </h3>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-gray-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-900 p-3.5 rounded-lg border border-gray-700 space-y-1.5">
              <div>
                <span className="text-gray-400">Candidate:</span>{' '}
                <strong className="text-gray-100">{selectedReg.full_name}</strong>
              </div>
              <div>
                <span className="text-gray-400">Institutional Email:</span>{' '}
                <span className="font-mono text-cyan-300">{selectedReg.email}</span>
              </div>
              <div>
                <span className="text-gray-400">Username / USN:</span>{' '}
                <span className="font-mono text-gray-200">@{selectedReg.username}</span>
              </div>
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1.5">
                Assign Clearance Level & System Role
              </label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="USER">Standard User (Student / Regular)</option>
                <option value="ANALYST">Security Analyst (Threat Investigation & SOC)</option>
                {isSuperAdmin && <option value="ADMIN">Administrator (Administrative Control)</option>}
                {isSuperAdmin && <option value="SUPERADMIN">Super Administrator (Master Authority Tier)</option>}
              </select>
            </div>

            <div className="pt-3 border-t border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-950"
              >
                Confirm Clearance & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisteredUsers;