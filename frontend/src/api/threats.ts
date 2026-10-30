import axiosInstance from './axios';

export const threatsApi = {
  getThreats: async (params?: any) => {
    const response = await axiosInstance.get('/threats', { params });
    return response.data;
  },
  getThreat: async (id: string) => {
    const response = await axiosInstance.get(`/threats/${id}`);
    return response.data;
  },
  updateThreatStatus: async (id: string, status: string) => {
    const response = await axiosInstance.patch(`/threats/${id}/status`, { status });
    return response.data;
  }
};
