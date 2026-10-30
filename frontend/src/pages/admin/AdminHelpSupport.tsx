import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, Search, Filter, RefreshCw, Clock, CheckCircle2, 
  AlertCircle, MessageSquare, Send, User, Shield, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';

interface SupportTicket {
  id: string;
  user_email?: string;
  user_name?: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const AdminHelpSupport: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Per-ticket edit state
  const [editStatus, setEditStatus] = useState<Record<string, string>>({});
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/support/admin/requests');
      const data: SupportTicket[] = res.data || [];
      setTickets(data);
      
      // Initialize edit states
      const statuses: Record<string, string> = {};
      const notes: Record<string, string> = {};
      data.forEach(t => {
        statuses[t.id] = t.status;
        notes[t.id] = t.admin_notes || '';
      });
      setEditStatus(statuses);
      setEditNotes(notes);
    } catch {
      toast.error('Failed to load user support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateTicket = async (ticketId: string) => {
    setSavingId(ticketId);
    try {
      await apiClient.patch(`/support/admin/requests/${ticketId}`, {
        status: editStatus[ticketId],
        admin_notes: editNotes[ticketId],
      });
      toast.success(`Ticket ${ticketId} updated successfully`);
      fetchTickets();
    } catch {
      toast.error(`Failed to update ticket ${ticketId}`);
    } finally {
      setSavingId(null);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.user_email && t.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.user_name && t.user_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">Open</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">In Progress</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Resolved</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-600/30">Closed</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800 uppercase">High Priority</span>;
      case 'NORMAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800 uppercase">Normal Priority</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/60 text-blue-400 border border-blue-800 uppercase">Low Priority</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <LifeBuoy className="text-cyan-400" size={28} />
            Users Help & Support Console
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage inquiries, technical support tickets, and identity verification requests submitted by students and users.
          </p>
        </div>
        <button
          onClick={fetchTickets}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Tickets
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <span className="text-xs text-gray-400 uppercase font-semibold">Total Requests</span>
          <div className="text-2xl font-bold text-gray-100 mt-1">{totalCount}</div>
          <span className="text-[11px] text-cyan-400 mt-0.5 block">All user submissions</span>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <span className="text-xs text-gray-400 uppercase font-semibold">Awaiting Response</span>
          <div className="text-2xl font-bold text-blue-400 mt-1">{openCount}</div>
          <span className="text-[11px] text-blue-300 mt-0.5 block">Requires review</span>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <span className="text-xs text-gray-400 uppercase font-semibold">In Progress</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{inProgressCount}</div>
          <span className="text-[11px] text-amber-300 mt-0.5 block">Under investigation</span>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <span className="text-xs text-gray-400 uppercase font-semibold">Resolved / Closed</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{resolvedCount}</div>
          <span className="text-[11px] text-emerald-300 mt-0.5 block">Completed inquiries</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket ID, subject, or user email..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-xs text-gray-100 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Filter size={14} />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <Loader2 className="animate-spin text-cyan-400 mx-auto mb-3" size={32} />
            <p className="text-sm text-gray-400">Loading user support tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <LifeBuoy className="text-gray-600 mx-auto mb-3" size={40} />
            <h3 className="text-base font-semibold text-gray-300">No support tickets found</h3>
            <p className="text-xs text-gray-500 mt-1">
              No tickets matched your filter criteria or no inquiries have been logged.
            </p>
          </div>
        ) : (
          filteredTickets.map((t) => {
            const isExpanded = expandedId === t.id;
            return (
              <div 
                key={t.id}
                className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden transition-colors"
              >
                {/* Header Row */}
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-750 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400 text-xs px-2 py-0.5 bg-cyan-950/70 border border-cyan-800 rounded">
                        {t.id}
                      </span>
                      {getStatusBadge(t.status)}
                      {getPriorityBadge(t.priority)}
                      <span className="text-xs text-gray-400 flex items-center gap-1 ml-2">
                        <Clock size={12} />
                        {new Date(t.created_at).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-100">{t.subject}</h3>

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1 text-gray-300">
                        <User size={13} className="text-cyan-400" />
                        {t.user_name || 'Student / User'}
                      </span>
                      {t.user_email && (
                        <span className="font-mono text-gray-400">
                          {t.user_email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      className="p-1.5 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-gray-700 transition-colors"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details & Admin Response Console */}
                {isExpanded && (
                  <div className="border-t border-gray-700 p-5 bg-gray-900/60 space-y-4">
                    {/* User Query Description */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        User Inquiry Description
                      </h4>
                      <div className="p-3.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {t.description}
                      </div>
                    </div>

                    {/* Admin Response & Status Update Section */}
                    <div className="pt-2 border-t border-gray-700/60">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
                        <MessageSquare size={14} />
                        SOC Administrator Response & Ticket Status Control
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1">
                            Update Status
                          </label>
                          <select
                            value={editStatus[t.id] ?? t.status}
                            onChange={(e) => setEditStatus({ ...editStatus, [t.id]: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                          >
                            <option value="OPEN">Open (Pending)</option>
                            <option value="IN_PROGRESS">In Progress (Investigating)</option>
                            <option value="RESOLVED">Resolved (Action Taken)</option>
                            <option value="CLOSED">Closed (Archived)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                          Admin Notes & User Resolution Reply
                        </label>
                        <textarea
                          rows={3}
                          value={editNotes[t.id] ?? ''}
                          onChange={(e) => setEditNotes({ ...editNotes, [t.id]: e.target.value })}
                          placeholder="Enter administrative notes, resolution details, or instructions for the user..."
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 resize-none font-sans"
                        />
                      </div>

                      <div className="flex justify-end gap-3 mt-3">
                        <button
                          onClick={() => handleUpdateTicket(t.id)}
                          disabled={savingId === t.id}
                          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-md shadow-cyan-950"
                        >
                          {savingId === t.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Send size={14} />
                          )}
                          <span>Save Status & Response</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminHelpSupport;
