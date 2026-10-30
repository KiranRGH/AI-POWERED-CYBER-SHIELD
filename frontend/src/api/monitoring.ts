import axiosInstance from './axios';

export const monitoringApi = {
  getEvents: async (params?: any) => {
    const response = await axiosInstance.get('/monitoring/events', { params });
    return response.data;
  },
  createEvent: async (data: any) => {
    const response = await axiosInstance.post('/monitoring/events', data);
    return response.data;
  }
};
