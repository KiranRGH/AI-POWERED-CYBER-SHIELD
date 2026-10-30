import apiClient from './axios';

export interface ReportParams {
  report_type?: string;
  start_date?: string;
  end_date?: string;
  format?: 'pdf' | 'csv';
}

export interface Report {
  id: number;
  title: string;
  report_type: string;
  status: string;
  format: string;
  created_at: string;
  file_size?: number;
}

export const reportsApi = {
  getReports: async (params?: ReportParams): Promise<{ items: Report[]; total: number }> => {
    const response = await apiClient.get('/reports', { params });
    return response.data;
  },

  createReport: async (data: ReportParams): Promise<Report> => {
    const response = await apiClient.post('/reports', data);
    return response.data;
  },

  getReport: async (id: number): Promise<Report> => {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },

  downloadReport: async (id: number, filename?: string): Promise<void> => {
    const response = await apiClient.get(`/reports/${id}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename ?? `report-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  deleteReport: async (id: number): Promise<void> => {
    await apiClient.delete(`/reports/${id}`);
  },
};

export default reportsApi;
