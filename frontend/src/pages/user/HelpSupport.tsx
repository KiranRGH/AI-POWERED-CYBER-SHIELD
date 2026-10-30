import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  LifeBuoy, Mail, FileText, Send, Loader2, ChevronDown, ChevronUp, Clock, AlertCircle,
  Shield, CheckCircle2, Search, Filter, User, MessageSquare, Save
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const ticketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH'])
});

type TicketFormValues = z.infer<typeof ticketSchema>;

interface SupportTicket {
  id: string;
  user_email?: string;
  user_name?: string;
  username?: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  created_at: string;
  updated_at: string;
  admin_notes?: string | null;
}

export default function HelpSupport() {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isStaff = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'ANALYST';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');

  // Staff response states per ticket
  const [editingNotes, setEditingNotes] = useState<{ [ticketId: string]: string }>({});
  const [editingStatus, setEditingStatus] = useState<{ [ticketId: string]: string }>({});
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { priority: 'NORMAL' }
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/support/me');
      const data = response.data.results || response.data || [];
      setTickets(Array.isArray(data) ? data : []);

      // Pre-fill staff notes state
      const initialNotes: { [id: string]: string } = {};
      const initialStatuses: { [id: string]: string } = {};
      data.forEach((t: SupportTicket) => {
        initialNotes[t.id] = t.admin_notes || '';
        initialStatuses[t.id] = t.status || 'OPEN';
      });
      setEditingNotes(initialNotes);
      setEditingStatus(initialStatuses);
    } catch (error) {
      // Mock data fallback
      const mockTickets: SupportTicket[] = [
        { 
          id: 'TKT-0001', 
          user_email: 'student.cs@cbit.ac.in',
          user_name: 'Kiran Kumar',
          username: '1CK21CS045',
          subject: 'Roll number verification query', 
          description: 'Query regarding USN format validation for new branch students.', 
          status: 'RESOLVED', 
          priority: 'NORMAL', 
          created_at: new Date(Date.now() - 172800000).toISOString(), 
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          admin_notes: 'All VTU USNs following 1[College][Year][Branch][Roll] format are automatically verified.'
        }
      ];
      setTickets(mockTickets);
      setEditingNotes({ 'TKT-0001': mockTickets[0].admin_notes || '' });
      setEditingStatus({ 'TKT-0001': 'RESOLVED' });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TicketFormValues) => {
    try {
      const payload = {
        ...data,
        user_email: user?.email,
        user_name: user?.full_name || user?.username,
      };
      const response = await apiClient.post('/support', payload);
      toast.success('Support query submitted successfully!');
      reset();
      
      if (response.data && response.data.id) {
        setTickets(prev => [response.data, ...prev]);
        setEditingNotes(prev => ({ ...prev, [response.data.id]: '' }));
        setEditingStatus(prev => ({ ...prev, [response.data.id]: 'OPEN' }));
      } else {
        fetchTickets();
      }
    } catch (error) {
      toast.error('Failed to submit ticket');
    }
  };

  const handleStaffUpdateTicket = async (ticketId: string) => {
    setUpdatingTicketId(ticketId);
    try {
      const newStatus = editingStatus[ticketId] || 'IN_PROGRESS';
      const notes = editingNotes[ticketId] || '';

      const res = await apiClient.patch(`/support/${ticketId}`, {
        status: newStatus,
        admin_notes: notes
      });

      toast.success(`Ticket ${ticketId} updated successfully`);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus as any, admin_notes: notes, updated_at: new Date().toISOString() } : t));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update ticket');
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': 
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">Open</span>;
      case 'IN_PROGRESS': 
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">In Progress</span>;
      case 'RESOLVED': 
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Resolved</span>;
      case 'CLOSED': 
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/30">Closed</span>;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-rose-400';
      case 'NORMAL': return 'text-amber-400';
      case 'LOW': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchEmail = t.user_email?.toLowerCase().includes(q);
      const matchName = t.user_name?.toLowerCase().includes(q);
      const matchId = t.id?.toLowerCase().includes(q);
      return matchSubject || matchDesc || matchEmail || matchName || matchId;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <LifeBuoy className="text-cyan-400" size={26} />
            Institutional Help & Support Desk
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isStaff 
              ? 'Administrator & SOC Analyst Desk — manage queries, update ticket status, and reply to students.' 
              : 'Submit support queries, track resolution progress, and contact campus IT administrators.'}
          </p>
        </div>

        {isStaff && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-xs text-cyan-300 font-medium">
            <Shield size={14} className="text-cyan-400" />
            <span>Staff Mode Active ({user?.role})</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Create Form & Quick Info */}
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg">
            <h3 className="text-base font-bold text-white mb-4 border-b border-gray-700 pb-3 flex items-center gap-2">
              <FileText className="text-cyan-400" size={18} /> Submit a Query
            </h3>
              
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Subject</label>
                <input 
                  {...register('subject')}
                  className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none placeholder-gray-500"
                  placeholder="e.g. USN Roll Number Verification"
                />
                {errors.subject && <p className="text-xs text-rose-400 mt-1">{errors.subject.message}</p>}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Priority</label>
                <select 
                  {...register('priority')}
                  className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                >
                  <option value="LOW">Low - General inquiry</option>
                  <option value="NORMAL">Normal - Non-critical query</option>
                  <option value="HIGH">High - Urgent / Attendance block</option>
                </select>
                {errors.priority && <p className="text-xs text-rose-400 mt-1">{errors.priority.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea 
                  {...register('description')}
                  rows={4}
                  className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none placeholder-gray-500"
                  placeholder="Detail your question or issue here..."
                />
                {errors.description && <p className="text-xs text-rose-400 mt-1">{errors.description.message}</p>}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-md shadow-cyan-900/20"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Ticket
              </button>
            </form>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3 shadow-lg">
            <h3 className="text-sm font-bold text-white border-b border-gray-700 pb-2">Support Resources</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 text-gray-300">
                <FileText className="text-cyan-400" size={16} />
                <span>Format: <code className="text-cyan-300 font-mono">1CK21CS045</code></span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-300">
                <LifeBuoy className="text-cyan-400" size={16} />
                <span>IT Support Desk: Room 102, Main Admin Block</span>
              </div>
              <a href="mailto:support@cbitkolar.edu.in" className="flex items-center gap-2.5 text-cyan-400 hover:text-cyan-300 transition-colors">
                <Mail size={16} />
                <span>support@cbitkolar.edu.in</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket List & Staff Response Panel */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col shadow-lg">
            {/* Filter & Search Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      statusFilter === status
                        ? 'bg-cyan-600 text-white shadow'
                        : 'bg-gray-900 text-gray-400 hover:text-gray-200 border border-gray-700'
                    }`}
                  >
                    {status === 'ALL' ? 'All Tickets' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search queries..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
              
            {/* Ticket List Body */}
            <div className="flex-1 divide-y divide-gray-700 overflow-y-auto max-h-[750px]">
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <LifeBuoy className="h-12 w-12 text-gray-600 mb-3 opacity-50" />
                  <p className="text-base font-medium text-gray-300">No support tickets found</p>
                  <p className="text-xs text-gray-500 mt-1">Submit a query or clear your search filter.</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-gray-800 transition-colors">
                    <div 
                      onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                      className="p-5 cursor-pointer hover:bg-gray-750 flex justify-between items-start"
                    >
                      <div className="space-y-2 flex-1 pr-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="font-semibold text-white text-base">{ticket.subject}</h4>
                          {getStatusBadge(ticket.status)}
                          <span className={`text-xs font-semibold flex items-center gap-1 ${getPriorityColor(ticket.priority)}`}>
                            <AlertCircle className="h-3 w-3" /> {ticket.priority}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          {ticket.user_name && (
                            <span className="flex items-center gap-1 text-gray-300 font-medium">
                              <User size={13} className="text-cyan-400" />
                              {ticket.user_name}
                              {ticket.username && (
                                <span className="font-mono text-cyan-400 text-[11px]">({ticket.username})</span>
                              )}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-gray-500" /> {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-gray-500">ID: #{ticket.id}</span>
                        </div>
                      </div>

                      <div className="text-gray-400 mt-2">
                        {expandedId === ticket.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedId === ticket.id && (
                      <div className="p-5 pt-0 bg-gray-900/40 border-t border-gray-700/60 space-y-4">
                        <div className="pt-3">
                          <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Query Description
                          </h5>
                          <p className="text-sm text-gray-200 whitespace-pre-wrap bg-gray-900/60 p-3.5 rounded-lg border border-gray-800">
                            {ticket.description}
                          </p>
                        </div>

                        {/* Existing Staff Response Display (Visible to Students) */}
                        {!isStaff && ticket.admin_notes && (
                          <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-lg p-4">
                            <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <LifeBuoy className="h-4 w-4" /> Official Support Response
                            </h5>
                            <p className="text-sm text-gray-200 whitespace-pre-wrap">{ticket.admin_notes}</p>
                          </div>
                        )}

                        {/* Staff Management Panel (Analysts, Admins, Superadmins) */}
                        {isStaff && (
                          <div className="bg-gray-900 border border-cyan-900/60 rounded-xl p-4 space-y-3 mt-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5" /> Staff Action & Official Response
                              </h5>
                              <span className="text-[11px] text-gray-400">
                                Submitter: {ticket.user_email || 'student'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-1">
                                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                  Update Status
                                </label>
                                <select
                                  value={editingStatus[ticket.id] || ticket.status}
                                  onChange={(e) => setEditingStatus({ ...editingStatus, [ticket.id]: e.target.value })}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                >
                                  <option value="OPEN">OPEN</option>
                                  <option value="IN_PROGRESS">IN PROGRESS</option>
                                  <option value="RESOLVED">RESOLVED</option>
                                  <option value="CLOSED">CLOSED</option>
                                </select>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                  Official Staff Response / Admin Notes
                                </label>
                                <textarea
                                  rows={3}
                                  value={editingNotes[ticket.id] !== undefined ? editingNotes[ticket.id] : (ticket.admin_notes || '')}
                                  onChange={(e) => setEditingNotes({ ...editingNotes, [ticket.id]: e.target.value })}
                                  placeholder="Enter official resolution or message visible to the student..."
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => handleStaffUpdateTicket(ticket.id)}
                                disabled={updatingTicketId === ticket.id}
                                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow"
                              >
                                {updatingTicketId === ticket.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                                Save Response & Status
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
