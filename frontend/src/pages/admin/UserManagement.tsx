import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Edit, Trash2, Key, Shield, ShieldAlert,
  CheckCircle2, XCircle, RefreshCw, UserX, RotateCcw,
  Unlock, Lock, AlertTriangle, Crown, Activity
} from 'lucide-react';
import apiClient from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';

interface UserItem {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  is_locked?: boolean;
  failed_login_attempts?: number;
  unblock_requested?: boolean;
  unblock_reason?: string;
  unblock_requested_at?: string;
  created_at: string;
  last_login?: string;
}

export const UserManagement: React.FC = () => {
  const { user: authUser } = useAuth();
  const currentRole = (authUser?.role || 'USER').toUpperCase();
  const isSuperAdmin = currentRole === 'SUPERADMIN';
  const isAdmin = currentRole === 'ADMIN';

  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit / Manage Modal state
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('USER');
  const [editActive, setEditActive] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users', {
        params: {
          page,
          page_size: pageSize,
          search: search || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      setUsers(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to retrieve user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openManageModal = (user: UserItem) => {
    setSelectedUser(user);
    setEditFullName(user.full_name || '');
    setEditRole(user.role || 'USER');
    setEditActive(user.is_active);
    setShowManageModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await apiClient.patch(`/admin/users/${selectedUser.id}`, {
        full_name: editFullName,
        role: editRole,
        is_active: editActive,
      });
      toast.success(`Account for ${selectedUser.username} updated`);
      setShowManageModal(false);
      fetchUsers();
    } catch {
      toast.error('Failed to update user profile');
    }
  };

  const handleResetPassword = async (userId: number) => {
    try {
      const res = await apiClient.post(`/admin/users/${userId}/reset-password`);
      toast.success(res.data.message || 'Password reset link dispatched');
    } catch {
      toast.error('Failed to reset user password');
    }
  };

  const handleRevokeSessions = async (userId: number) => {
    try {
      await apiClient.post(`/admin/users/${userId}/revoke-sessions`);
      toast.success('All active sessions for this account revoked');
    } catch {
      toast.error('Failed to revoke sessions');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Permanently delete user account '${username}'?`)) return;
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      toast.success(`User '${username}' deleted`);
      setShowManageModal(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleUnblockUser = async (userId: number, username: string) => {
    try {
      const res = await apiClient.post(`/admin/users/${userId}/unblock`);
      toast.success(res.data.message || `User '${username}' has been unblocked!`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to unblock user');
    }
  };

  const handleBlockUser = async (userId: number, username: string) => {
    if (!window.confirm(`Suspend and lock account for '${username}'?`)) return;
    try {
      const res = await apiClient.post(`/admin/users/${userId}/block`);
      toast.success(res.data.message || `User '${username}' has been blocked`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to block user');
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="p-12 text-center bg-gray-800 rounded-2xl border border-gray-700">
        <ShieldAlert size={56} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-100">Access Restricted</h2>
        <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
          User Account Governance requires administrative authority. Please contact the Super Administrator if you require elevated privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Users className="text-cyan-400" size={28} />
            User Account & Identity Governance
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage system access, adjust role tiers, enforce account locks, and audit operator logins.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, full name, email..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Roles</option>
            <option value="SUPERADMIN">Superadmin</option>
            <option value="ADMIN">Admin</option>
            <option value="ANALYST">Analyst</option>
            <option value="USER">User</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active (Permitted)</option>
            <option value="suspended">Suspended / Inactive</option>
            <option value="locked">🔒 Locked Accounts</option>
            <option value="unblock_requested">🚨 Unblock Requests</option>
          </select>
        </div>
      </div>

      {/* Unblock Requests Alert Banner */}
      {users.some((u) => u.unblock_requested) && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="font-semibold text-sm">Account Unblock Requests Pending</div>
              <div className="text-xs text-amber-300/80">
                {users.filter((u) => u.unblock_requested).length} user(s) submitted account unblock requests. Review reason and click Unblock below.
              </div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'unblock_requested' ? '' : 'unblock_requested')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg shadow transition-colors"
          >
            {statusFilter === 'unblock_requested' ? 'Show All Users' : 'Filter Unblock Requests'}
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/60 text-gray-400 uppercase text-xs border-b border-gray-700 font-medium">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5">System Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Created At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading user accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-100">{u.full_name}</div>
                      <div className="text-xs text-gray-400 font-mono">@{u.username}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-300">
                      {u.email}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.role === 'SUPERADMIN' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-purple-950 text-purple-300 border border-purple-600 shadow-sm shadow-purple-950">
                          <Crown size={12} className="text-purple-400" />
                          Superadmin (Master Authority)
                        </span>
                      ) : u.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-cyan-950 text-cyan-400 border border-cyan-800">
                          <Shield size={12} />
                          Admin
                        </span>
                      ) : u.role === 'ANALYST' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-blue-950 text-blue-400 border border-blue-800">
                          <Activity size={12} />
                          Analyst
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase bg-gray-900 text-gray-400 border border-gray-700">
                          <Users size={12} />
                          Student / User
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.unblock_requested ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-500 animate-pulse">
                            <AlertTriangle size={12} className="text-amber-400" />
                            Unblock Requested
                          </span>
                          {u.unblock_reason && (
                            <div className="text-[11px] text-amber-200/90 italic max-w-xs truncate" title={u.unblock_reason}>
                              "{u.unblock_reason}"
                            </div>
                          )}
                        </div>
                      ) : u.is_locked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950 text-rose-300 border border-rose-800">
                          <Lock size={12} />
                          Locked ({u.failed_login_attempts || 0} fails)
                        </span>
                      ) : u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 size={12} />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-950 text-red-400 border border-red-800">
                          <XCircle size={12} />
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {(() => {
                        const isTargetSuperAdmin = u.role === 'SUPERADMIN';
                        const isTargetAdmin = u.role === 'ADMIN';
                        const canManage = isSuperAdmin || (!isTargetSuperAdmin && !isTargetAdmin);

                        if (!canManage) {
                          return (
                            <span className="text-[11px] text-gray-500 italic px-2 py-1">
                              Protected
                            </span>
                          );
                        }

                        return (
                          <div className="flex items-center justify-end gap-2">
                            {(u.is_locked || !u.is_active || u.unblock_requested) ? (
                              <button
                                onClick={() => handleUnblockUser(u.id, u.username)}
                                title="Unblock user and restore account access"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-all flex items-center gap-1 shadow-sm shadow-emerald-950"
                              >
                                <Unlock size={12} />
                                Unblock User
                              </button>
                            ) : u.role !== 'SUPERADMIN' ? (
                              <button
                                onClick={() => handleBlockUser(u.id, u.username)}
                                title="Block and suspend user account"
                                className="px-2 py-1 bg-gray-800 hover:bg-red-950 hover:text-red-300 text-gray-400 border border-gray-700 hover:border-red-800 rounded text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <Lock size={12} />
                                Block
                              </button>
                            ) : null}
                            <button
                              onClick={() => openManageModal(u)}
                              className="px-3 py-1 bg-gray-700 hover:bg-cyan-600 hover:text-white text-gray-200 rounded text-xs font-medium transition-colors"
                            >
                              Manage
                            </button>
                            {isSuperAdmin && !isTargetSuperAdmin && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                title="Permanently Delete Account (Superadmin Exclusive Authority)"
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 hover:border-rose-600 rounded text-xs font-semibold transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            )}
                          </div>
                        );
                      })()}
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
            Showing <span className="text-gray-200">{users.length}</span> of{' '}
            <span className="text-gray-200">{total}</span> total accounts
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

      {/* Manage User Modal */}
      {showManageModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <Edit className="text-cyan-400" size={20} />
                Manage Account: {selectedUser.username}
              </h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-gray-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="text-gray-300 font-medium block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-medium block mb-1">Role Delegation</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="USER">USER (Student Account)</option>
                    <option value="ANALYST">ANALYST (Security Investigator)</option>
                    {isSuperAdmin && <option value="ADMIN">ADMIN (System Administrator)</option>}
                    {isSuperAdmin && <option value="SUPERADMIN">SUPERADMIN (Master Authority Tier)</option>}
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 font-medium block mb-1">Account Status</label>
                  <select
                    value={editActive ? 'active' : 'suspended'}
                    onChange={(e) => setEditActive(e.target.value === 'active')}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="active">Active (Permitted)</option>
                    <option value="suspended">Suspended (Locked)</option>
                  </select>
                </div>
              </div>

              {/* Security Actions Section */}
              <div className="p-3 bg-gray-900 rounded-lg border border-gray-700 space-y-2">
                <span className="text-gray-400 uppercase font-semibold text-[10px] block">
                  Security Interventions & Access Control
                </span>
                <div className="flex flex-wrap gap-2">
                  {(selectedUser.is_locked || !selectedUser.is_active || selectedUser.unblock_requested) ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleUnblockUser(selectedUser.id, selectedUser.username);
                        setShowManageModal(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow-md shadow-emerald-950"
                    >
                      <Unlock size={13} />
                      Unblock & Restore Account
                    </button>
                  ) : selectedUser.role !== 'SUPERADMIN' ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleBlockUser(selectedUser.id, selectedUser.username);
                        setShowManageModal(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 rounded border border-red-800 font-medium"
                    >
                      <Lock size={13} className="text-red-400" />
                      Block Account
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleResetPassword(selectedUser.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded border border-gray-700"
                  >
                    <RotateCcw size={13} className="text-cyan-400" />
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevokeSessions(selectedUser.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded border border-gray-700"
                  >
                    <UserX size={13} className="text-amber-400" />
                    Terminate Sessions
                  </button>
                  {isSuperAdmin && selectedUser.role !== 'SUPERADMIN' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(selectedUser.id, selectedUser.username)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 rounded border border-red-800 ml-auto"
                    >
                      <Trash2 size={13} />
                      Delete Account
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManageModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-950"
                >
                  Save Account Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
