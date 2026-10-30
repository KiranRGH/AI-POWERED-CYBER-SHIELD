import apiClient from './axios';

export interface AnalyticsSummary {
  total_events: number;
  total_threats: number;
  blocked_attempts: number;
  avg_confidence: number;
  threats_by_severity: Record<string, number>;
  threats_by_type: Record<string, number>;
  top_source_ips: Array<{ ip: string; count: number; country?: string }>;
  top_countries: Array<{ country: string; count: number }>;
}

export interface TrendPoint {
  timestamp: string;
  count: number;
  threats: number;
}

export interface AnalyticsParams {
  time_range?: '24h' | '7d' | '30d' | '90d';
  start_date?: string;
  end_date?: string;
}

export const analyticsApi = {
  getSummary: async (params?: AnalyticsParams): Promise<AnalyticsSummary> => {
    const response = await apiClient.get('/analytics/summary', { params });
    return response.data;
  },

  getTrends: async (params?: AnalyticsParams): Promise<TrendPoint[]> => {
    const response = await apiClient.get('/analytics/trends', { params });
    return response.data;
  },

  getGeographic: async (params?: AnalyticsParams): Promise<Array<{ country: string; lat: number; lng: number; count: number }>> => {
    const response = await apiClient.get('/analytics/geographic', { params });
    return response.data;
  },

  exportCSV: async (params?: AnalyticsParams): Promise<void> => {
    const response = await apiClient.get('/analytics/export', {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `analytics-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default analyticsApi;
