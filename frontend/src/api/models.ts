import axiosInstance from './axios';

export const modelsApi = {
  getModels: async () => {
    const response = await axiosInstance.get('/models');
    return response.data;
  },
  activateModel: async (id: string) => {
    const response = await axiosInstance.post(`/models/${id}/activate`);
    return response.data;
  },
  getModelMetrics: async (id: string) => {
    const response = await axiosInstance.get(`/models/${id}/metrics`);
    return response.data;
  },
  trainModel: async (data: any) => {
    const response = await axiosInstance.post('/models/train', data);
    return response.data;
  },
  getDatasets: async () => {
    const response = await axiosInstance.get('/models/datasets');
    return response.data;
  },
  uploadDataset: async (data: FormData) => {
    const response = await axiosInstance.post('/models/datasets', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};
