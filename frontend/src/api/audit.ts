import apiClient from './axios';

export interface AuditLog {
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

export interface AuditLogsParams {
  page?: number;
  page_size?: number;
  search?: string;
  action?: string;
  result?: string;
  start_date?: string;
  end_date?: string;
}

export const auditApi = {
  getAuditLogs: async (params?: AuditLogsParams): Promise<{ items: AuditLog[]; total: number }> => {
    const response = await apiClient.get('/admin/audit-logs', { params });
    return response.data;
  },

  exportCSV: async (params?: AuditLogsParams): Promise<void> => {
    const response = await apiClient.get('/admin/audit-logs/export', {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit-logs-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default auditApi;
