import apiClient from './axios';

export interface FirewallRule {
  id: number;
  rule_type: string;
  ip_address: string | null;
  ip_range: string | null;
  port: number | null;
  protocol: string | null;
  action: 'BLOCK' | 'ALLOW' | 'LOG';
  reason: string;
  is_active: boolean;
  is_temporary: boolean;
  expires_at: string | null;
  created_at: string;
  created_by_id?: number;
}

export interface DefenseProposal {
  id: number;
  action_type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED';
  requires_approval: boolean;
  explanation: string;
  created_at: string;
  threat_id: number | null;
  executed_at?: string;
  approved_by_id?: number;
}

export interface FirewallRulesParams {
  page?: number;
  page_size?: number;
  action?: string;
  is_active?: boolean;
}

export const firewallApi = {
  getRules: async (params?: FirewallRulesParams): Promise<{ items: FirewallRule[]; total: number }> => {
    const response = await apiClient.get('/firewall/rules', { params });
    return response.data;
  },

  createRule: async (data: Partial<FirewallRule>): Promise<FirewallRule> => {
    const response = await apiClient.post('/firewall/rules', data);
    return response.data;
  },

  deleteRule: async (id: number): Promise<void> => {
    await apiClient.delete(`/firewall/rules/${id}`);
  },

  toggleRule: async (id: number, isActive: boolean): Promise<FirewallRule> => {
    const response = await apiClient.patch(`/firewall/rules/${id}`, { is_active: isActive });
    return response.data;
  },

  getProposals: async (params?: { status?: string; page?: number }): Promise<{ items: DefenseProposal[]; total: number }> => {
    const response = await apiClient.get('/firewall/proposals', { params });
    return response.data;
  },

  approveProposal: async (id: number): Promise<DefenseProposal> => {
    const response = await apiClient.post(`/firewall/proposals/${id}/approve`);
    return response.data;
  },

  rejectProposal: async (id: number, reason?: string): Promise<DefenseProposal> => {
    const response = await apiClient.post(`/firewall/proposals/${id}/reject`, { reason });
    return response.data;
  },

  getBlocklist: async (): Promise<FirewallRule[]> => {
    const response = await apiClient.get('/firewall/rules', { params: { action: 'BLOCK', is_active: true } });
    return response.data.items ?? response.data;
  },
};

export default firewallApi;
