import axiosInstance from './axios';

export const reportsApi = {
  getReports: async () => (await axiosInstance.get('/reports')).data,
  createReport: async (data: any) => (await axiosInstance.post('/reports', data)).data,
  getReport: async (id: string) => (await axiosInstance.get(`/reports/${id}`)).data,
  downloadReport: async (id: string) => {
    const res = await axiosInstance.get(`/reports/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
  }
};

export const auditApi = {
  getAuditLogs: async (params?: any) => (await axiosInstance.get('/audit', { params })).data,
};

export const settingsApi = {
  getSettings: async () => (await axiosInstance.get('/settings')).data,
  updateSettings: async (data: any) => (await axiosInstance.put('/settings', data)).data,
  getUserSettings: async () => (await axiosInstance.get('/settings/me')).data,
};

export const systemHealthApi = {
  getHealth: async () => (await axiosInstance.get('/health')).data,
  getSystemHealth: async () => (await axiosInstance.get('/system-health')).data,
};

export const rolesApi = {
  getRoles: async () => (await axiosInstance.get('/roles')).data,
  createRole: async (data: any) => (await axiosInstance.post('/roles', data)).data,
  updateRole: async (id: string, data: any) => (await axiosInstance.put(`/roles/${id}`, data)).data,
  getPermissions: async () => (await axiosInstance.get('/permissions')).data,
};

export const supportApi = {
  createRequest: async (data: any) => (await axiosInstance.post('/support', data)).data,
  getMyRequests: async () => (await axiosInstance.get('/support/me')).data,
  getAllRequests: async () => (await axiosInstance.get('/support')).data,
};
