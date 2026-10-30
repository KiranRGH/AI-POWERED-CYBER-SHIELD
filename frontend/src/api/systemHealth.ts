import apiClient from './axios';

export interface SystemHealthComponent {
  name: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'not_configured';
  message?: string;
  response_time_ms?: number;
  last_checked?: string;
}

export interface SystemHealth {
  overall_status: string;
  timestamp: string;
  components: SystemHealthComponent[];
}

export const systemHealthApi = {
  getHealth: async (): Promise<SystemHealth> => {
    const response = await apiClient.get('/admin/system-health');
    return response.data;
  },
};

export default systemHealthApi;
