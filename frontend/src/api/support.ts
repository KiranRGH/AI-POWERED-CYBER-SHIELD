import apiClient from './axios';

export interface SupportTicket {
  id: number;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

export const supportApi = {
  createTicket: async (data: CreateTicketData): Promise<SupportTicket> => {
    const response = await apiClient.post('/support', data);
    return response.data;
  },

  getMyTickets: async (): Promise<SupportTicket[]> => {
    const response = await apiClient.get('/support/me');
    return response.data;
  },

  getTicket: async (id: number): Promise<SupportTicket> => {
    const response = await apiClient.get(`/support/${id}`);
    return response.data;
  },

  // Admin only
  getAllTickets: async (params?: { status?: string; priority?: string; page?: number }): Promise<{ items: SupportTicket[]; total: number }> => {
    const response = await apiClient.get('/support', { params });
    return response.data;
  },

  updateTicket: async (id: number, data: { status?: string; admin_notes?: string }): Promise<SupportTicket> => {
    const response = await apiClient.patch(`/support/${id}`, data);
    return response.data;
  },
};

export default supportApi;
